import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { t } from '@/lib/i18n';

const PaymentButton = ({ planId, amount, children }) => {
  const { lang } = useLanguage();
  const T = useMemo(() => (key, fallback) => { const translated = t(lang, key); return translated !== key ? translated : fallback; }, [lang]);
  const [showModal, setShowModal] = useState(false);

  const handleClick = () => {
    if (/Capacitor|Cordova|AppWebView/i.test(navigator.userAgent)) {
      setShowModal(true);
    } else {
      console.log("Initiating Stripe Checkout");
    }
  };

  return (
    <>
      <button onClick={handleClick}>{children}</button>
      {showModal && (
        <div className="payment-modal">
          <p>{T("processPaymentWebPortal", "Please process this payment through our official web portal to comply with store policies.")}</p>
          <a href="https://rayma.app/upgrade">https://rayma.app/upgrade</a>
        </div>
      )}
    </>
  );
};

export default PaymentButton;