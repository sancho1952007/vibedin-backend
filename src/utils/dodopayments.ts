import Dodopayments from 'dodopayments';

const DodoPayClient = new Dodopayments({
    bearerToken: Bun.env.DODO_PAYMENTS_API_KEY,
    environment: Bun.env.NODE_ENV === 'production' ? 'live_mode' : 'test_mode'
});

export default DodoPayClient;