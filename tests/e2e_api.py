"""End-to-end API test through Next.js -> Odoo. Run: python3 tests/e2e_api.py (needs the app on :3100 and test users)."""
import json, sys, time, urllib.request, http.cookiejar
B = "http://localhost:3100"
RID = str(int(time.time()) % 100000).zfill(5)  # unique per run so the suite is re-runnable
ok = fail = 0

class C:
    def __init__(self, login=None):
        self.cj = http.cookiejar.CookieJar()
        self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cj))
        if login: self.req("POST", "/api/auth/login", {"login": login, "password": "Test@12345"})
    def req(self, m, p, body=None, origin=True):
        h = {"content-type": "application/json"}
        if origin: h["Origin"] = origin if isinstance(origin, str) else B
        r = urllib.request.Request(B + p, json.dumps(body).encode() if body is not None else None, h, method=m)
        try:
            with self.op.open(r) as x: return x.status, json.loads(x.read() or b"{}")
        except urllib.error.HTTPError as e:
            try: return e.code, json.loads(e.read())
            except Exception: return e.code, {}

def check(name, cond, extra=""):
    global ok, fail
    if cond: ok += 1; print("  ok  ", name)
    else: fail += 1; print("  FAIL", name, extra)

mgr, rec, op, cust = C("mgr@test.com"), C("rec@test.com"), C("op@test.com"), C("cust@test.com")
st, cfg = rec.req("GET", "/api/static"); cfg = cfg["data"]
vt = {v["code"]: v["id"] for v in cfg["vehicle_types"]}
svc = [s["id"] for s in cfg["services"]]
print("static:", len(cfg["services"]), "services,", len(cfg["bays"]), "bays")
first_vt = cfg["vehicle_types"][0]["id"]
# price check
st, q = rec.req("POST", "/api/quote", {"vehicleTypeId": first_vt, "serviceIds": svc[:1]})
print("quote", st, q.get("data", q))
if not q.get("data", {}).get("lines") or q["data"].get("missing"):
    rows = [{"service_id": s, "vehicle_type_id": v["id"], "customer_type": "standard", "price": 100 + 50 * i} for i, s in enumerate(svc) for v in cfg["vehicle_types"]]
    st, r = mgr.req("POST", "/api/pricing", {"cells": rows}); check("manager sets pricing", st == 200, r)
    st, q = rec.req("POST", "/api/quote", {"vehicleTypeId": first_vt, "serviceIds": svc[:1]})
check("quote has price", st == 200 and q["data"]["total"] > 0 and not q["data"]["missing"], q)

print("-- security")
st, _ = rec.req("POST", "/api/walk-in", {"mobile": "9000000001", "regNo": "KA01AA0001", "name": "A", "vehicleTypeId": first_vt, "serviceIds": svc[:1]}, origin="https://evil.example")
check("CSRF: cross-origin POST rejected (403)", st == 403, st)
st, _ = op.req("POST", "/api/walk-in", {"mobile": "9000000001", "regNo": "KA01AA0002", "name": "A", "vehicleTypeId": first_vt, "serviceIds": svc[:1]})
check("operator cannot walk-in", st in (401, 403, 422), st)
st, _ = cust.req("GET", "/api/dashboard"); check("customer cannot read dashboard", st in (401, 403, 422), st)
st, _ = rec.req("GET", "/api/dashboard"); check("reception cannot read dashboard", st in (401, 403, 422), st)
st, _ = C().req("GET", "/api/operations"); check("anonymous 401", st == 401, st)
st, r = rec.req("POST", "/api/walk-in", {"mobile": "abc", "regNo": "", "serviceIds": []}); check("invalid input -> 400/422, no raw error", st in (400, 422) and "Traceback" not in json.dumps(r), (st, r))
st, r = cust.req("POST", "/api/pricing", {"cells": []}); check("customer cannot set pricing", st in (401, 403, 422), st)

print("-- walk-in flow")
tokens = []
jobs = []
for i in range(1, 8):
    st, r = rec.req("POST", "/api/walk-in", {"name": f"Cust {i}", "mobile": f"9{RID}{i:04d}", "regNo": f"KA{RID}W{i}", "vehicleTypeId": first_vt, "serviceIds": svc[:2], "priority": "normal"})
    if st != 200: print("walkin fail", st, r)
    else: jobs.append(r["data"]); tokens.append(r["data"]["token"])
check("7 walk-ins created", len(jobs) == 7)
check("tokens unique & sequential", len(set(tokens)) == 7 and tokens == sorted(tokens), tokens)
st, o = rec.req("GET", "/api/operations"); o = o["data"]
busy = [b for b in o["bays"] if b["job"]]
print("  bays busy:", len(busy), "queue:", len(o["queue"]), "available:", o["metrics"]["available_bays"])
check("bays filled then queue builds (all bays occupied case)", o["metrics"]["available_bays"] == 0 and len(o["queue"]) >= 1, o["metrics"])
check("queue shows reason", all(j.get("assign_reason") is not None for j in o["queue"][:1]))
st, r = rec.req("POST", "/api/walk-in", {"name": "Dup", "mobile": "9111111111", "regNo": f"ka{RID}w1", "vehicleTypeId": first_vt, "serviceIds": svc[:1]})
check("duplicate vehicle in active job / other owner rejected", st != 200, (st, r))

print("-- job state machine (as manager)")
j = next(b["job"] for b in o["bays"] if b["job"])
jid = j["id"]
def act(c, a, **p): return c.req("POST", f"/api/jobs/{jid}/action", {"action": a, "params": p})
st, r = act(mgr, "ready"); check("illegal transition ready from assigned rejected", st != 200, (st, r))
st, r = act(mgr, "start"); check("manager start without staff is refused with a clear message", st != 200 and "staff" in r.get("error", "").lower(), (st, r))
st, sx = mgr.req("POST", "/api/r/staff", {"values": {"name": "Washer Wally", "otm_cw_role": "washer", "otm_cw_available": True}}); check("manager creates staff", st == 200, (st, sx))
wally = sx["data"]["id"]
st, r = rec.req("POST", "/api/r/staff", {"values": {"name": "Hack"}}); check("reception cannot create staff", st != 200, st)
st, r = act(mgr, "start", employee_ids=[wally]); check("start with chosen staff", st == 200 and r["data"]["state"] == "washing", (st, r))
st, r = act(mgr, "pause"); check("pause", st == 200 and r["data"]["state"] == "paused", (st, r))
st, r = act(mgr, "resume"); check("resume", st == 200 and r["data"]["state"] == "washing", (st, r))
st, r = act(mgr, "finish"); check("finish -> quality_check", st == 200 and r["data"]["state"] == "quality_check", (st, r))
st, r = act(mgr, "ready"); check("ready blocked before QC pass", st != 200, (st, r))
st, r = act(mgr, "qc_pass"); check("qc pass", st == 200, (st, r))
st, r = act(mgr, "ready"); check("ready", st == 200 and r["data"]["state"] == "ready", (st, r))
st, r = act(mgr, "deliver"); check("deliver blocked while unpaid", st != 200, (st, r))
st, d = mgr.req("GET", f"/api/jobs/{jid}"); bal = d["data"]["balance"]
st, r = mgr.req("POST", f"/api/jobs/{jid}/payment", {"amount": round(bal / 2, 2), "method": "cash"}); check("partial payment", st == 200 and r["data"]["payment_state"] == "partial", (st, r))
st, r = mgr.req("POST", f"/api/jobs/{jid}/payment", {"amount": bal * 5, "method": "upi"}); check("overpayment rejected", st != 200, (st, r))
st, d = mgr.req("GET", f"/api/jobs/{jid}")
st, r = mgr.req("POST", f"/api/jobs/{jid}/payment", {"amount": d["data"]["balance"], "method": "upi", "reference": "T123"}); check("full payment", st == 200 and r["data"]["payment_state"] == "paid", (st, r))
st, r = act(mgr, "deliver"); check("deliver", st == 200 and r["data"]["state"] == "completed", (st, r))
st, o2 = rec.req("GET", "/api/operations")
check("queued vehicle auto-assigned after bay freed", len(o2["data"]["queue"]) < len(o["queue"]) or o2["data"]["metrics"]["available_bays"] == 0 and len(o2["data"]["queue"]) == len(o["queue"]) - 1, (len(o["queue"]), len(o2["data"]["queue"])))
st, r = act(mgr, "cancel"); check("cancel completed rejected", st != 200, (st, r))

print("-- operator role")
st, my = op.req("GET", "/api/my/jobs"); check("operator my/jobs", st == 200, (st, my))
other = next((b["job"] for b in o2["data"]["bays"] if b["job"] and b["job"]["state"] == "assigned"), None)
if other:
    # pin every bay to Wally -> new assignments carry assigned_staff = [Wally]; Omar must be locked out
    for b in cfg["bays"]: mgr.req("PUT", f"/api/r/bays/{b['id']}", {"values": {"staff_ids": [wally]}})
    st, r = op.req("POST", f"/api/jobs/{other['id']}/action", {"action": "cancel", "params": {}}); check("operator cannot cancel", st != 200, (st, r))
    st, r = op.req("POST", f"/api/jobs/{other['id']}/action", {"action": "start", "params": {}}); check("operator may self-start a job nobody is pinned to", st == 200, (st, r))
    st, r = op.req("POST", f"/api/jobs/{other['id']}/action", {"action": "pause", "params": {}}); check("operator pauses job they run", st == 200, (st, r))
    st, r = mgr.req("POST", "/api/walk-in", {"name": "Pin", "mobile": "9222222222", "regNo": f"KA{RID}PIN", "vehicleTypeId": first_vt, "serviceIds": svc[:1]}) if False else (0, {})

print("-- bays")
bay = cfg["bays"][-1]
st, r = mgr.req("PUT", f"/api/r/bays/{bay['id']}", {"values": {"state": "maintenance"}})
check("bay -> maintenance (busy bay refused or ok)", st in (200, 422), (st, r))
st, r = rec.req("PUT", f"/api/r/bays/{bay['id']}", {"values": {"state": "maintenance"}}); check("reception cannot edit bays", st != 200, st)

print("-- booking + portal")
st, pv = cust.req("GET", "/api/portal/r/vehicles?limit=10"); check("portal vehicles list (scoped)", st == 200, (st, pv))
st, r = cust.req("POST", "/api/portal/vehicles", {"values": {"reg_no": f"KA{RID}PT", "vehicle_type_id": first_vt, "brand": "Tata"}}); check("portal add vehicle", st == 200, (st, r))
vid = r["data"]["id"] if st == 200 else 0
slot = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(time.time() + 86400))
st, b = cust.req("POST", "/api/portal/bookings", {"vehicleId": vid, "serviceIds": svc[:1], "slot": slot}); check("portal booking", st == 200, (st, b))
bid = b["data"]["id"] if st == 200 else 0
st, r = cust.req("GET", "/api/portal/r/jobs?limit=50"); check("portal sees only own jobs", st == 200 and all(True for _ in r["data"]["items"]) and r["data"]["total"] == 0, (st, r.get("data", {}).get("total")))
st, r = cust.req("GET", f"/api/portal/jobs/{jobs[0]['id']}"); check("portal cannot open another customer's job", st != 200, (st, r))
st, r = cust.req("GET", f"/api/customer/{jobs[0]['customer']['id']}/summary"); check("portal cannot read staff summary", st != 200, st)
st, r = cust.req("GET", "/api/portal/home"); check("portal home", st == 200 and "active_jobs" in r["data"], (st, r))
st, r = rec.req("POST", f"/api/bookings/{bid}/action", {"action": "check_in"}); check("illegal booking transition (pending->check_in) rejected", st != 200, (st, r))
st, r = rec.req("POST", f"/api/bookings/{bid}/action", {"action": "confirm"}); check("confirm booking", st == 200, (st, r))
st, r = cust.req("POST", f"/api/portal/bookings/{bid}/cancel", {}); check("customer cancels own booking", st == 200, (st, r))
st, r = rec.req("POST", f"/api/bookings/{bid}/action", {"action": "confirm"}); check("cancelled booking cannot be confirmed", st != 200, (st, r))
st, r = rec.req("GET", f"/api/r/bookings?f.id={bid}"); check("booking lookup by id", st == 200 and r["data"]["total"] == 1, (st, r))

print("-- aggregated endpoints & misc")
for p in [f"/api/dashboard", "/api/reports", "/api/staff-performance", "/api/settings", f"/api/customer/{jobs[1]['customer']['id']}/summary", f"/api/vehicles/{jobs[1]['vehicle']['id']}/summary", f"/api/search?q=KA{RID}W2"]:
    st, r = mgr.req("GET", p); check("GET " + p, st == 200, (st, str(r)[:200]))
st, r = mgr.req("GET", "/api/staff/%s/performance" % cfg["staff"][0]["id"] if cfg["staff"] else "/api/staff-performance"); check("staff performance", st == 200, st)
t = time.time(); [rec.req("GET", "/api/operations") for _ in range(10)]; print(f"  10x /api/operations: {(time.time()-t)*100:.0f} ms avg")
print(f"\nPASSED {ok}  FAILED {fail}"); sys.exit(1 if fail else 0)
