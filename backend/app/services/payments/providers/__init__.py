from app.services.payments.providers.robokassa import RobokassaProvider
from app.services.payments.providers.tbank import TBankProvider
from app.services.payments.providers.yookassa import YooKassaProvider

PROVIDERS = {
    "robokassa": RobokassaProvider(),
    "tbank": TBankProvider(),
    "yookassa": YooKassaProvider(),
}
