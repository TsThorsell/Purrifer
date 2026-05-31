import json
import sys


def handle(req):
    req_type = req.get("type")
    payload = req.get("payload", {})
    if req_type == "extractDocumentFields":
        result = [
            {
                "fieldKey": "amount_total",
                "value": "0.00",
                "confidence": 0.42,
                "region": {"x": 0.62, "y": 0.18, "width": 0.18, "height": 0.05},
            },
            {
                "fieldKey": "invoice_date",
                "value": "1970-01-01",
                "confidence": 0.35,
                "region": {"x": 0.14, "y": 0.18, "width": 0.18, "height": 0.05},
            },
        ]
        return {"ok": True, "data": result}
    if req_type == "extractDocumentTables":
        result = [
            {
                "tableKey": "line_items",
                "headers": ["text", "qty", "amount"],
                "rows": [["Example item", "1", "0.00"]],
                "confidence": 0.31,
            }
        ]
        return {"ok": True, "data": result}
    if req_type == "updateFieldRegion":
        return {
            "ok": True,
            "data": {
                "fieldKey": payload.get("fieldKey", "unknown"),
                "value": "",
                "confidence": 0.9,
                "region": payload.get("region"),
            },
        }
    if req_type in ("saveFieldTemplate", "saveTableTemplate"):
        return {"ok": True, "data": None}
    return {"ok": False, "error": {"code": "PYTHON_UNKNOWN_TYPE", "message": f"Unknown type: {req_type}"}}


for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    req = json.loads(line)
    response = handle(req)
    response["id"] = req.get("id")
    sys.stdout.write(json.dumps(response) + "\n")
    sys.stdout.flush()
