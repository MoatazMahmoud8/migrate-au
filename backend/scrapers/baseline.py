from datetime import datetime, timezone


def _utc_now_iso():
    return datetime.now(timezone.utc).isoformat()


def store_hash_baseline(meta_ref, doc_id, current_hash, extra_fields=None):
    doc = {"hash": current_hash, "last_checked": _utc_now_iso()}
    if extra_fields:
        doc.update(extra_fields)
    meta_ref.document(doc_id).set(doc, merge=True)


def store_seen_urls_baseline(meta_ref, doc_id, seen_urls, extra_fields=None):
    doc = {"seen_urls": seen_urls, "last_checked": _utc_now_iso()}
    if extra_fields:
        doc.update(extra_fields)
    meta_ref.document(doc_id).set(doc, merge=True)
