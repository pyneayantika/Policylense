"""
Shared constants.

WHY: Magic strings like relationship names and ingestion statuses get typed
wrong if they are copied around. One module keeps the dashboard, rules, and
database talking about the same values.
"""

RELATIONSHIPS = ("self", "spouse", "child", "parent_1", "parent_2")
POLICY_TYPES = ("health", "life", "vehicle", "home")
INGESTION_STATUSES = ("pending", "processing", "completed", "failed")
FLAG_SEVERITIES = ("critical", "warning", "info")

# Below this extracted character count we assume a scanned/image PDF.
MIN_DIGITAL_PDF_CHARS = 100
