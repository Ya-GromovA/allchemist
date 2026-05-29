from __future__ import annotations

from typing import Protocol


class PaymentProvider(Protocol):
    name: str

    def build_checkout_url(self, *, payment_id: str, amount_rub: int, module_id: str, return_url: str) -> str:
        ...

    def map_status(self, status: str) -> str:
        ...
