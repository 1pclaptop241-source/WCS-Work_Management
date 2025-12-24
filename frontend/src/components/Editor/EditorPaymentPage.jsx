import React from 'react';
import PaymentInfo from './PaymentInfo';

const EditorPaymentPage = () => {
    return (
        <div className="container">
            <div className="dashboard-header">
                <h1>Payment Information</h1>
            </div>
            <PaymentInfo />
        </div>
    );
};

export default EditorPaymentPage;
