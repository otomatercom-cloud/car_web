#!/usr/bin/env bash
# Sandbox only: resets active jobs/bays, restarts the Next.js server (clears rate limiter), runs the API suite.
set -e
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ODOO_SRC=${ODOO_SRC:-/home/claude/odoo-src}
MODULES="$(cd "$HERE/../../odoo" && pwd)"
(cd "$ODOO_SRC" && python3 odoo-bin shell -d "${ODOO_DB:-cwtest}" --db_host=127.0.0.1 --db_user=odoo --db_password=odoo \
  --addons-path=addons,odoo/addons,"$MODULES" < "$HERE/reset_sandbox.py" 2>&1 | tail -1)
bash /tmp/restart_next.sh
python3 "$HERE/e2e_api.py"
