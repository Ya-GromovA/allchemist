from __future__ import annotations

from app.core.config import settings


class TBankProvider:
    name = "tbank"

    def build_checkout_url(self, *, payment_id: str, amount_rub: int, module_id: str, return_url: str) -> str:
        terminal = settings.TBANK_TERMINAL_KEY or "demo-terminal"
        return (
            "https://securepay.tinkoff.ru/v2/Init"
            f"?TerminalKey={terminal}&OrderId={payment_id}&Amount={amount_rub * 100}&Description={module_id}&SuccessURL={return_url}"
        )

    def map_status(self, status: str) -> str:
        mapping = {
            "confirmed": "paid",
            "authorized": "authorized",
            "canceled": "failed",
            "failed": "failed",
            "refunded": "refunded",
            "paid": "paid",
        }
        return mapping.get(status.strip().lower(), status.strip().lower())
