from __future__ import annotations

from app.core.config import settings


class YooKassaProvider:
    name = "yookassa"

    def build_checkout_url(self, *, payment_id: str, amount_rub: int, module_id: str, return_url: str) -> str:
        shop_id = settings.YOOKASSA_SHOP_ID or "demo-shop"
        return (
            "https://yookassa.ru/checkout/payments/v2/contract"
            f"?shopId={shop_id}&paymentId={payment_id}&amount={amount_rub}&description={module_id}&return_url={return_url}"
        )

    def map_status(self, status: str) -> str:
        mapping = {
            "succeeded": "paid",
            "waiting_for_capture": "authorized",
            "canceled": "failed",
            "failed": "failed",
            "refunded": "refunded",
            "paid": "paid",
        }
        return mapping.get(status.strip().lower(), status.strip().lower())
