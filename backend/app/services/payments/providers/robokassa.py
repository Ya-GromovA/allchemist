from __future__ import annotations

from app.core.config import settings


class RobokassaProvider:
    name = "robokassa"

    def build_checkout_url(self, *, payment_id: str, amount_rub: int, module_id: str, return_url: str) -> str:
        login = settings.ROBOKASSA_MERCHANT_LOGIN or "demo-login"
        return (
            "https://auth.robokassa.ru/Merchant/Index.aspx"
            f"?MerchantLogin={login}&OutSum={amount_rub}&InvId={payment_id}&Description={module_id}"
            f"&Culture=ru&IncCurrLabel=RUB&ReturnUrl={return_url}"
        )

    def map_status(self, status: str) -> str:
        mapping = {
            "success": "paid",
            "paid": "paid",
            "fail": "failed",
            "failed": "failed",
            "refunded": "refunded",
        }
        return mapping.get(status.strip().lower(), status.strip().lower())
