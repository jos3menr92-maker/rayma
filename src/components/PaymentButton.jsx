import React, { useState } from 'react';

const PaymentButton = ({ planId, amount, children }) => {
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
          <p>Please process this payment through our official web portal to comply with store policies.</p>
          <a href="https://rayma.app/upgrade">https://rayma.app/upgrade</a>
        </div>
      )}
    </>
  );
};

export default PaymentButton;
