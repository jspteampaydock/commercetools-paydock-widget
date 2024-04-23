export default class PaydockCommercetoolWidget {
    static API_URL = 'https://api.paydock-commercetool-app.jetsoftpro.dev';

    // static API_URL = 'http://localhost:3003';

    constructor({selector, type, userId, paymentButtonSelector, radioGroupName}) {
        this.selector = selector;
        this.wallets = ['apple-pay', 'google-pay', 'afterpay_v2', 'paypal_smart'];
        this.apims = ['zippay', 'afterpay_v1'];
        this.billingInfoFields = [
            'first_name',
            'last_name',
            'email',
            'phone',
            'address_line1',
            'address_line2',
            'address_city',
            'address_state',
            'address_country',
            'address_postcode'
        ]
        this.cartItemsFields = [
            'name',
            'type',
            'quantity',
            'item_uri',
            'image_uri',
            'amount'
        ];
        this.canvasSelector = '#paydock-widget-container-3ds';
        this.type = type;
        this.userId = userId || 0;
        this.amount = 0;
        this.currency = 'AUD';
        this.preChargeWalletToken = null;
        this.paymentButtonElem = null;
        this.configuration = null;
        this.country = null;
        this.widget = null;
        this.canvas = null;
        this.vaultToken = undefined;
        this.paymentSource = undefined;
        this.sleepSetTimeout_ctrl = undefined;
        this.saveCard = false;
        this.paymentButtonSelector = paymentButtonSelector;
        this.spinner = null;
        this.overlay = null;
        this.additionalInfo = undefined;
        this.radioGroupName = radioGroupName;
        this.isValidForm = false;
        this.wasInit = false;
        this.billingInfo = {};
        this.shippingInfo = {};
        this.cartItems = [];
        this.referenceId = null;
    }

    setBillingInfo(data) {
        data = this.objectToSnakeCaseFiled(data);
        this.billingInfoFields.forEach((fieldName) => {
            let notEmptyFiled = data.hasOwnProperty(fieldName) && !!data[fieldName];

            this.billingInfo[fieldName] = notEmptyFiled ? data[fieldName] : null;
        })
    }

    setShippingInfo(data) {
        data = this.objectToSnakeCaseFiled(data);
        this.billingInfoFields.forEach((fieldName) => {
            let notEmptyFiled = data.hasOwnProperty(fieldName) && !!data[fieldName];

            this.shippingInfo[fieldName] = notEmptyFiled ? data[fieldName] : null;
        })
    }

    addCartItem(data) {
        data = this.objectToSnakeCaseFiled(data);
        let dataItem = {};

        this.cartItemsFields.forEach((fieldName) => {
            let notEmptyFiled = data.hasOwnProperty(fieldName) && !!data[fieldName];

            dataItem[fieldName] = notEmptyFiled ? data[fieldName] : null;
        })
        this.cartItems.push(dataItem);
    }

    setCartItems(items) {
        this.cartItems = [];

        items.forEach((item) => {
            this.addCartItem(item)
        })
    }

    stringToSnakeCase(string) {
        if ('string' !== typeof string) {
            string = string.toString();
        }

        return string.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    }

    setRefernce(id) {
        this.referenceId = id;
    }

    objectToSnakeCaseFiled(object) {
        let result = {};
        for (let field in object) {
            result[this.stringToSnakeCase(field)] = object[field];
        }

        return result;
    }

    afterpayError() {

    }

    setIsValidForm(isValid) {
        this.isValidForm = isValid;
    }

    getWasInit() {
        return this.wasInit;
    }

    afterpayProcessOrder() {
        const inputSourceId = "payment_source_paydock-pay-afterpay_v2";
        const widgetContainer = document.querySelector(this.selector);

        let interval = setInterval(() => {
            const inputHidden = document.querySelector('[name="' + inputSourceId + '"]');
            if (inputHidden === null) {
                widgetContainer.insertAdjacentHTML('afterend', '<input type="hidden" name="' + inputSourceId + '">')
            }
            if (this.paymentButtonElem) {
                let insertElement = document.querySelector('[name="' + inputSourceId + '"]')
                clearInterval(interval)
                insertElement.value = JSON.stringify({
                    event: "paymentSuccessful",
                    data: {
                        "id": window.localStorage.getItem('paydock-charge-id'),
                        "amount": this.amount,
                        "currency": this.currency,
                        "status": "pending"
                    }
                });
                this.paymentButtonElem.click();
            }
        }, 100)
    }

    checkIfAfterpayIsSuccess() {
        const params = Object.fromEntries(new URLSearchParams(location.search));

        let result = params.hasOwnProperty('success') && params.success === 'true';

        if (result) {
            this.setSpinner('body');
            this.afterpayProcessOrder();
        } else {
            this.afterpayError()
        }

        return result;
    }

    checkIfAfterpayAfterRedirect() {
        const params = Object.fromEntries(new URLSearchParams(location.search));

        return params.hasOwnProperty('afterpay') && params.afterpay === 'true';
    }

    setPaymentButtonElem(paymentButtonElem) {
        this.paymentButtonElem = paymentButtonElem;
    }

    setAmount(amount) {
        this.amount = amount;
    }

    setCurrency(currency) {
        this.currency = currency;
    }

    setPaymentSource(paymentSource) {
        this.paymentSource = paymentSource;
    }

    setVaultToken(vaultToken) {
        this.vaultToken = vaultToken;
    }

    setAdditionalInfo(additionalInfo) {
        additionalInfo.address_country = 'AU'; // TODO hardcode
        this.additionalInfo = additionalInfo;
    }

    setSpinner(containerSelector) {
        const container = document.querySelector(containerSelector || this.paymentButtonSelector);
        if (container) {
            this.spinner = document.createElement('div');
            this.spinner.classList.add('widget-spinner');
            if (container.tagName.toLowerCase() === 'body') {
                this.overlay = document.createElement('div');
                this.overlay.classList.add('widget-overlay');
                this.overlay.appendChild(this.spinner);
                container.appendChild(this.overlay);
                return;
            }
            container.classList.add('widget-set-disabled');
            container.appendChild(this.spinner);
        }
    }

    removeSpinner(containerSelector) {
        const container = document.querySelector(containerSelector);
        if ('#' + container.id === this.paymentButtonSelector) {
            container.classList.remove('widget-set-disabled');
            const spinnerElement = container.querySelector('.widget-spinner');
            if (spinnerElement) spinnerElement.remove();
            return
        }
        if (this.spinner && this.spinner.parentNode && container) {
            this.spinner.parentNode.removeChild(this.spinner);
            this.spinner = null;
            if (this.overlay && this.overlay.parentNode && container.tagName.toLowerCase() === 'body') {
                this.overlay.parentNode.removeChild(this.overlay);
                this.overlay = null;
            }
            container.classList.remove('widget-set-disabled');
        }
    }

    loadPayDockScript() {
        return new Promise((resolve, reject) => {
            const scriptDOM = document.querySelector('script[src="https://widget.paydock.com/sdk/latest/widget.umd.js"]');
            if (scriptDOM) return resolve();

            const script = document.createElement('script');
            script.src = "https://widget.paydock.com/sdk/latest/widget.umd.js";
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    fetchData() {
        return new Promise((resolve, reject) => {
            fetch(PaydockCommercetoolWidget.API_URL + '/get-widget-data?' + new URLSearchParams({
                clientId: 1,
                userId: this.userId
            }))
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(response => {
                    this.configuration = response.data;
                    resolve();
                })
                .catch(error => {
                    console.error('Could not fetch data:', error);
                    reject(error);
                });
        });
    }

    displayPaymentMethods(paymentMethod) {
        console.log(paymentMethod);
        const methodsContainer = document.querySelector('#paydock-widget-container');
        if (!methodsContainer) {
            console.error("Container for payment methods not found");
            return;
        }

        const methodContainer = document.createElement('div');
        methodContainer.classList.add('paydock-widget_payment-method');

        const methodHead = document.createElement('div');
        methodHead.classList.add('paydock-widget_head');

        const radioButton = document.createElement('input');
        radioButton.type = 'radio';
        radioButton.id = `radio_${paymentMethod.name}`;
        radioButton.name = this.radioGroupName;
        radioButton.value = paymentMethod.name;
        methodHead.appendChild(radioButton);

        const label = document.createElement('label');
        label.setAttribute('for', radioButton.id);

        const paymentButton = document.querySelector(this.paymentButtonSelector);
        const handlePaymentMethodClick = (event) => {
            const clickedElement = event.currentTarget;
            const head = clickedElement.parentElement;
            const body = head.nextElementSibling;

            if (!body || !body.classList.contains('paydock-widget_body')) return;

            if (this.wallets.includes(paymentMethod.type) && !head.classList.contains('active')) {
                paymentButton.classList.add("hide");
                this.initWalletButtons(this.type);
            } else if (this.apims.includes(paymentMethod.type) && !head.classList.contains('active')) {
                paymentButton.classList.add("hide");
                this.initAPIMSButtons(this.type);
            } else {
                paymentButton.classList.remove("hide");
            }

            if (this.widget && !head.classList.contains('active') && !this.wallets.includes(paymentMethod.type) && !this.apims.includes(paymentMethod.type)) {
                this.setSpinner('#' + paymentMethod.name);
                const widgetContainer = document.querySelector(this.selector);
                const checkboxEl = widgetContainer.querySelector('.widget-paydock-checkbox');
                if (checkboxEl !== null) checkboxEl.remove();
                this.widget.reload();
                this.widget.on('afterLoad', () => {
                    this.removeSpinner('#' + paymentMethod.name);
                    const widgetSpinner = document.querySelector('.widget-spinner');
                    if (widgetSpinner) this.removeSpinner(this.paymentButtonSelector);
                });
            }

            const prevVisibleBody = methodsContainer.querySelector('.paydock-widget_body:not(.hide)');
            if (prevVisibleBody && prevVisibleBody !== body) {
                prevVisibleBody.classList.add('hide');
                prevVisibleBody.previousElementSibling.classList.remove('active');
                const spinnerElement = prevVisibleBody.querySelector('.widget-spinner');
                if (spinnerElement) spinnerElement.parentNode.removeChild(spinnerElement);
                const widgetDisable = prevVisibleBody.querySelector('.widget-set-disabled');
                if (widgetDisable) widgetDisable.classList.remove('widget-set-disabled');
            }

            const isHidden = body.classList.contains('hide');
            if (isHidden) {
                body.classList.remove('hide');
                head.classList.add('active');
            }
        };
        label.addEventListener('click', handlePaymentMethodClick);
        methodHead.appendChild(label);

        const methodName = document.createTextNode(paymentMethod.description);
        const italicElement = document.createElement('i');
        italicElement.appendChild(methodName);
        label.appendChild(italicElement);

        methodContainer.appendChild(methodHead);

        const methodBody = document.createElement('div');
        methodBody.classList.add('paydock-widget_body', 'hide');

        const widgetWrapper = document.createElement('div');
        widgetWrapper.setAttribute('id', paymentMethod.name);
        methodBody.appendChild(widgetWrapper);
        methodContainer.appendChild(methodBody);
        methodsContainer.appendChild(methodContainer);
        this.addRadioButtonChangeHandler();
    }

    addRadioButtonChangeHandler() {
        const paymentMethodRadios = document.querySelectorAll(`input[name="${this.radioGroupName}"]`);
        paymentMethodRadios.forEach(radioButton => {
            radioButton.addEventListener('change', () => {
                const methodsContainer = document.querySelector('#paydock-widget-container');
                if (!methodsContainer.contains(radioButton) && radioButton.checked === true) {
                    const visiblePaydockWidget = methodsContainer.querySelector('.paydock-widget_body:not(.hide)');
                    if (visiblePaydockWidget) {
                        visiblePaydockWidget.classList.add('hide');
                        const spinnerElement = visiblePaydockWidget.querySelector('.widget-spinner');
                        if (spinnerElement) spinnerElement.parentNode.removeChild(spinnerElement);
                        const headActivePaydockWidget = methodsContainer.querySelector('.paydock-widget_head.active');
                        if (headActivePaydockWidget) headActivePaydockWidget.classList.remove('active');
                        const widgetDisable = methodsContainer.querySelector('.widget-set-disabled');
                        if (widgetDisable) widgetDisable.classList.remove('widget-set-disabled');
                    }
                }
            });
        });
    }

    async createWidget() {

        const widgetContainer = document.querySelector(this.selector);

        if (this.widget !== null) return;

        if (this.type === 'bank_accounts') {
            const bankAccount = new paydock.Configuration(this.configuration.bank_accounts_gateway_id, 'bank_account');

            bankAccount.setFormFields(['account_routing', 'address_country', 'address_postcode', 'address_state', 'address_city', 'address_line1', 'address_line2', 'email']);

            this.widget = new paydock.HtmlMultiWidget(this.selector, this.configuration.credentials_public_key, [bankAccount]);

            this.widget.onFinishInsert('input[name="payment_source_bank_accounts_token"]', 'payment_source');

            const inputHidden = document.querySelector('[name="payment_source_bank_accounts_token"]');
            if (inputHidden === null) widgetContainer.insertAdjacentHTML('afterend', '<input type="hidden" name="payment_source_bank_accounts_token">')
        }
        if (this.type === 'card') {
            let isPermanent = this.configuration.card_3ds !== 'Disable' && this.configuration.card_3ds_flow === 'With OTT'

            let gatewayId = isPermanent ? this.configuration.card_gateway_id : 'not_configured';

            this.widget = new paydock.HtmlWidget(this.selector, this.configuration.credentials_public_key, gatewayId);
            const supportedCardIcons = this.configuration.card_supported_card_schemes.map(item => item.value.toLowerCase());
            this.widget.setSupportedCardIcons(supportedCardIcons);

            this.widget.setFormFields(['address_country', 'address_postcode', 'address_state', 'address_city', 'address_line1', 'address_line2', 'email']);

            this.widget.onFinishInsert('input[name="payment_source_card_token"]', 'payment_source');

            const containerServerError = document.querySelector('#paydock-widget-card-server-error');
            if (containerServerError === null) widgetContainer.insertAdjacentHTML('afterend', '<div id="paydock-widget-card-server-error" class="hide paydock-server-error"></div>');

            const container3Ds = document.querySelector('#paydock-widget-container-3ds');
            if (container3Ds === null) widgetContainer.insertAdjacentHTML('afterend', '<div id="paydock-widget-container-3ds" class="hide"></div>');

            const inputHidden = document.querySelector('[name="payment_source_card_token"]');
            if (inputHidden === null) widgetContainer.insertAdjacentHTML('afterend', '<input type="hidden" name="payment_source_card_token">');
        }

        if (this.type === 'bank_accounts' || this.type === 'card') {
            this.widget.on('afterLoad', () => {
                this.widget.hideElements(['submit_button', 'address_country', 'address_postcode', 'address_state', 'address_city', 'address_line1', 'address_line2', 'email']);
            });

            this.widget.setStyles({
                background_color: this.configuration.widget_style_bg_color,
                text_color: this.configuration.widget_style_text_color,
                border_color: this.configuration.widget_style_border_color,
                error_color: this.configuration.widget_style_error_color,
                success_color: this.configuration.widget_style_success_color,
                font_size: this.configuration.widget_style_font_size,
                font_family: this.configuration.widget_style_font_family
            });
            this.widget.interceptSubmitForm(this.selector);
            this.widget.load();
        }
    }


    async initAPIMSButtons(type) {

        const widgetContainer = document.querySelector(this.selector);

        if (this.widget !== null) return;
        this.setSpinner(this.selector);
        let data = {};
        let meta = {};
        if (type === 'zippay') {
            const htmlBtnElem = document.querySelector('#paydockAPMsZipButton');
            if (htmlBtnElem === null) widgetContainer.insertAdjacentHTML('afterBegin', '<div align="center" id="paydockAPMsZipButton"></button>');
            this.widget = new paydock.ZipmoneyCheckoutButton(this.selector, this.configuration.credentials_public_key, this.configuration.alternative_payment_methods_zippay_gateway_id);
            meta = {
                charge: {
                    amount: this.amount,
                    currency: this.currency,
                }
            }
        } else {
            const htmlBtnElem = document.querySelector('#paydockAPMsAfterpayButton');
            if (htmlBtnElem === null) widgetContainer.insertAdjacentHTML('afterBegin', '<div align="center" id="paydockAPMsAfterpayButton"></div>');
            this.widget = new paydock.AfterpayCheckoutButton(this.selector, this.configuration.credentials_public_key, this.configuration.alternative_payment_methods_afterpay_v1_gateway_id);
            meta = {
                amount: this.amount,
                currency: this.currency,
                email: this.additionalInfo?.email ?? '',
                first_name: this.additionalInfo?.firstName ?? '',
                last_name: this.additionalInfo?.lastName ?? ''
            }
        }
        if (this.widget) {
            const inputHidden = document.querySelector('[name="payment_source_apm_token"]');
            if (inputHidden === null) widgetContainer.insertAdjacentHTML('afterend', '<input type="hidden" name="payment_source_apm_token">')
            this.widget.onFinishInsert('input[name="payment_source_apm_token"]', 'payment_source_token');
            this.widget.setMeta(meta);
            this.widget.on('finish', () => {
                if (this.paymentButtonElem) {
                    this.paymentButtonElem.click();
                }
            })
        }
        this.removeSpinner(this.selector);
    }

    async initWalletButtons(type) {
        if (this.widget) {
            return;
        }
        let paymentSourceInput = "payment_source_paydock-pay-" + type;
        let id = this.selector.replace('#', '');

        let element = document.getElementById(id);
        element.innerHTML = '';
        if (!this.preChargeWalletToken && !this.checkIfAfterpayAfterRedirect() && !this.isValidForm) {
            element.innerHTML = '<div class="error-field">' +
                'Please fill in the required fields of the form to display payment methods.' +
                '</div>'
            return;
        }

        this.wasInit = true;

        const widgetContainer = document.querySelector(this.selector);

        this.setSpinner(this.selector);
        if (!this.preChargeWalletToken && !this.checkIfAfterpayAfterRedirect()) {
            this.preChargeWalletToken = await this.createPreChargeWalletToken();
        } else if(this.checkIfAfterpayIsSuccess()) {
            return;
        }
        let widget = null;

        switch (type) {
            case  'apple-pay':
                widget = new paydock.WalletButtons(this.selector, this.preChargeWalletToken, {
                    amount_label: "Total",
                    country: 'AU', //@TODO: remove, need for test.
                    wallets: ["apple"]
                });
                console.log('selector: ' + this.selector)
                break;
            case  'google-pay':
                widget = new paydock.WalletButtons(this.selector, this.preChargeWalletToken, {
                    amount_label: "Total",
                    country: this.country,
                    wallets: ["google"]
                });
                console.log('selector: ' + this.selector)
                break;
            case  'afterpay_v2':
                window.localStorage.setItem('paydock_afterpay_v2_billing_address', JSON.stringify(this.billingInfo))
                window.localStorage.setItem('paydock_afterpay_v2_shipping_address', JSON.stringify(this.shippingInfo))
                window.localStorage.setItem('paydock_afterpay_v2_cart_items', JSON.stringify(this.cartItems))
                widget = new paydock.WalletButtons(this.selector, this.preChargeWalletToken, {
                    amount_label: this.amount,
                    country: 'AU',
                });
                break;
            case  'paypal_smart':
                widget = new paydock.WalletButtons(this.selector, this.preChargeWalletToken, {
                    request_shipping: true,
                    pay_later: false,
                    standalone: false,
                    country: this.country,
                });
                break;
            default:
                widget = null;
        }

        console.log('widget: ', this.widget)
        if (widget) {
            widget.setEnv('sandbox');
            widget.onUnavailable(() => console.log("No wallet buttons available"));
            widget.onPaymentError((data) => console.log("The payment was not successful"));
            widget.onPaymentInReview((data) => console.log("onPaymentInReview" + data));
            widget.load();

            this.widget = widget;
            const inputHidden = document.querySelector('[name="' + paymentSourceInput + '"]');
            if (inputHidden === null) {
                widgetContainer.insertAdjacentHTML('afterend', '<input type="hidden" name="' + paymentSourceInput + '">')
            }

            this.widget.onPaymentSuccessful((result) => {
                document.querySelector('[name="' + paymentSourceInput + '"]').value = JSON.stringify(result);
                if (this.paymentButtonElem) {
                    this.paymentButtonElem.click();
                }
            })

        }
        this.removeSpinner(this.selector);
    }

    async process() {
        const checkboxName = this.type === 'card' ? 'saveCard' : 'saveBA';
        const checkbox = document.querySelector(`input[name="${checkboxName}"]`);
        if (checkbox) {
            this.saveCard = checkbox.checked;
        }

        let result = {success: true};

        if (this.type === 'card') {
            if (['In-built 3DS', 'Standalone 3DS'].includes(this.configuration.card_3ds)) {
                let charge3dsId;
                if (this.configuration.card_3ds === 'In-built 3DS') {
                    charge3dsId = await this.initCardInBuild3Ds(this.saveCard);
                } else {
                    charge3dsId = await this.initCardStandalone3Ds();
                }

                if (charge3dsId === false) {
                    return {
                        type: 'error',
                        errorMessage: 'Please fill card data',
                        success: false
                    }
                }

                if (charge3dsId === 'error') {
                    return {
                        type: 'error',
                        errorMessage: 'Payment has been rejected by Paydock.',
                        success: false
                    }
                }
                result.charge3dsId = charge3dsId;
            }
        }

        return result;
    }


    async createPreChargeWalletToken() {
        const data = {
            wallet: this.type,
            amount: this.amount,
            currency: this.currency,
            reference: this.referenceId,
            additionalInfo: {
                billingInfo: this.billingInfo,
                shippingInfo: this.shippingInfo,
                items: this.cartItems
            },
            checkoutPage: window.location.href
        };

        try {
            const response = await fetch(PaydockCommercetoolWidget.API_URL + '/create-pre-charge-wallet-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });


            const responseData = await response.json();

            if (responseData.status === "Success" && responseData.token) {
                this.preChargeWalletToken = responseData.token;
                this.country = responseData.country;
                window.localStorage.setItem('paydock-charge-id', responseData.chargeId)
                return this.preChargeWalletToken;
            } else {
                throw new Error(responseData.message || 'Error');
            }
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }

    hasVaultToken() {
        return this.vaultToken !== undefined
    }

    async getVaultToken() {
        if (this.vaultToken !== undefined) {
            return this.vaultToken;
        }

        if (this.configuration.card_3ds === 'In-built 3DS' && this.configuration.card_3ds_flow === 'With OTT') {
            return this.paymentSource;
        }

        try {
            let data = {token: this.paymentSource};
            if (['card', 'bank_accounts'].includes(this.type) && !this.saveCard) {
                data.vault_type = 'session'
            }

            data.address_country = this.additionalInfo.address_country ?? '';
            data.address_postcode = this.additionalInfo.address_postcode ?? '';
            data.address_city = this.additionalInfo.address_city ?? '';
            data.address_state = this.additionalInfo.address_state ?? '';
            data.address_line1 = this.additionalInfo.address_line ?? '';
            data.address_line2 = this.additionalInfo.address_line2.length ? this.additionalInfo.address_line2 : (this.additionalInfo.address_line ?? '');

            const response = await fetch(PaydockCommercetoolWidget.API_URL + '/create-vault-token-by-ott', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    saveCard: this.saveCard,
                    type: this.type,
                    userId: this.userId,
                    clientId: 1, // TODO remove hardcode
                    data
                })
            });

            const responseData = await response.json();

            if (responseData.status === "Success" && responseData.token) {
                this.vaultToken = responseData.token;
                return this.vaultToken;
            } else {
                throw new Error(responseData.error || 'Error');
            }
        } catch (error) {
            // this.removeSpinner(this.selector);
            
            console.error('Error:', error);
            throw error;
        }
    }

    async cardInBuild3DsPreAuth() {
        try {
            const data = {
                amount: this.amount,
                currency: "AUD", //this.currency
                token: this.paymentSource,
                customer: {
                    first_name: this.additionalInfo?.billing_first_name ?? '',
                    last_name: this.additionalInfo?.billing_last_name ?? '',
                    email: this.additionalInfo?.billing_email ?? '',
                    phone: this.additionalInfo?.billing_phone ?? '',
                    payment_source: {
                        address_line1: this.additionalInfo?.address_line ?? '',
                        address_line2: this.additionalInfo?.address_line2 ?? '',
                        address_city: this.additionalInfo?.address_city ?? '',
                        address_postcode: this.additionalInfo?.address_postcode ?? '',
                        address_state: this.additionalInfo?.address_state ?? '',
                        address_country: this.additionalInfo?.address_country ?? '',
                    }
                },
                _3ds: {}
            };

            const response = await fetch(PaydockCommercetoolWidget.API_URL + '/create-in-build-3ds-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const responseData = await response.json();

            if (responseData.status === "Success" && responseData.chargeId) {
                return responseData.chargeId;
            } else {
                throw new Error(responseData.message || 'Error');
            }
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }

    async initCardInBuild3Ds(forcePermanentVault = false) {
        let result = false;
        const widgetContainer = document.querySelector(this.selector);
        const canvasContainer = document.querySelector(this.canvasSelector);

        if (this.vaultToken === undefined && (this.configuration.card_3ds_flow === 'With vault' || forcePermanentVault)) {
            this.vaultToken = await this.getVaultToken();
        }

        const envVal = this.configuration.sandbox_mode === 'Yes' ? 'sandbox' : 'production'

        const preAuthData = {
            amount: this.amount,
            currency: 'AUD', // this.currency
        };

        if (this.configuration.card_3ds_flow === 'With vault' || forcePermanentVault) {
            preAuthData.customer = {
                payment_source: {
                    vault_token: this.vaultToken,
                    gateway_id: this.configuration.card_gateway_id
                }
            }
        } else {
            preAuthData.token = this.paymentSource
        }

        const preAuthResp = await new paydock.Api(this.configuration.credentials_public_key)
            .setEnv(envVal)
            .charge()
            .preAuth(preAuthData);

        if (typeof preAuthResp._3ds.token === "undefined") {
            return false;
        }

        this.canvas = new paydock.Canvas3ds(this.canvasSelector, preAuthResp._3ds.token);
        this.canvas.load();

        widgetContainer.classList.add('hide');
        canvasContainer.classList.remove('hide');

        this.canvas.on('chargeAuth', (chargeAuthEvent) => {
            result = chargeAuthEvent.charge_3ds_id
        })
        this.canvas.on('additionalDataCollectReject', (chargeAuthSuccessEvent) => {
            result = 'error';
        })
        this.canvas.on('chargeAuthReject', function (data) {
            result = 'error';
        });

        for (let second = 1; second <= 10000; second++) {
            await this.sleep(100);

            if (result !== false) {
                break;
            }
        }

        return result;
    }

    async initCardStandalone3Ds() {
        const widgetContainer = document.querySelector(this.selector);
        const canvasContainer = document.querySelector(this.canvasSelector);

        if (this.vaultToken === undefined) {
            this.vaultToken = await this.getVaultToken();
        }

        const threeDsToken = await this.getStandalone3dsToken();

        this.canvas = new paydock.Canvas3ds(this.canvasSelector, threeDsToken);
        this.canvas.load();

        widgetContainer.classList.add('hide');
        canvasContainer.classList.remove('hide');

        let result = false;
        this.canvas.on('chargeAuthSuccess', (chargeAuthSuccessEvent) => {
            result = chargeAuthSuccessEvent.charge_3ds_id
        })
        this.canvas.on('additionalDataCollectReject', (chargeAuthSuccessEvent) => {
            result = 'error'
        })
        this.canvas.on('chargeAuthReject', function (data) {
            result = 'error';
        });

        for (let second = 1; second <= 10000; second++) {
            await this.sleep(100);

            if (result !== false) {
                break;
            }
        }

        return result;
    }

    async getStandalone3dsToken() {
        try {
            const currentDate = new Date();
            let payment_source = {
                vault_token: this.vaultToken,
                address_state: 'QLD', // TODO hadrcode
            }

            if (this.configuration.card_gateway_id) {
                payment_source.gateway_id = this.configuration.card_gateway_id;
            }

            const data = {
                amount: this.amount,
                reference: '',
                currency: "AUD",
                customer: {
                    first_name: this.additionalInfo?.billing_first_name ?? '',
                    last_name: this.additionalInfo?.billing_last_name ?? '',
                    email: this.additionalInfo?.billing_email ?? '',
                    payment_source: payment_source
                },
                _3ds: {
                    service_id: this.configuration.card_3ds_service_id ?? '',
                    authentication: {
                        type: "01",
                        date: currentDate.toISOString()
                    }
                }
            };

            const response = await fetch(PaydockCommercetoolWidget.API_URL + '/create-standalone-3ds-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const responseData = await response.json();

            if (responseData.status === "Success" && responseData.token) {
                return responseData.token;
            } else {
                throw new Error(responseData.message || 'Error');
            }
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }

    sleep(ms) {
        clearInterval(this.sleepSetTimeout_ctrl);
        return new Promise(resolve => this.sleepSetTimeout_ctrl = setTimeout(resolve, ms));
    }

    setAdditionalValue(billingData) {
        this.widget.updateFormValues({
            address_country: billingData?.value?.country ?? 'AU',
            address_postcode: billingData?.value?.postalCode ?? '',
            address_state: billingData?.value?.streetName ?? '',
            address_city: billingData?.value?.city ?? '',
            address_line1: billingData?.value?.additionalStreetInfo ?? '',
            address_line2: billingData?.value?.additionalStreetInfo ?? '',
            email: billingData?.value?.email ?? ''
        });
    }

    renderCredentialsSelect() {
        const widgetContainer = document.querySelector(this.selector);

        const selectEl = widgetContainer.querySelector('.select');
        if (selectEl !== null || !this.configuration.saved_credentials || !this.configuration.saved_credentials[this.type]) return;

        const savedCredentials = this.configuration.saved_credentials[this.type];

        if (Object.keys(savedCredentials).length) {

            const selectWrapper = document.createElement('div');
            selectWrapper.classList.add('widget-paydock-select');

            let savedPaymentDetailsText = 'Saved payment details';

            if (this.type === 'bank_accounts') selectWrapper.innerHTML = savedPaymentDetailsText;
            if (this.type === 'card') selectWrapper.innerHTML = savedPaymentDetailsText;

            let select = document.createElement('div');
            select.classList.add('select');

            widgetContainer.appendChild(selectWrapper);
            selectWrapper.appendChild(select);

            let value = document.createElement('div');
            value.classList.add('value');
            value.innerText = 'Select...';
            select.appendChild(value);

            const dropdown = document.createElement('div');
            dropdown.classList.add('dropdown');
            select.appendChild(dropdown);

            const optionsWrapper = document.createElement('ul');
            dropdown.appendChild(optionsWrapper);

            const option = document.createElement('li');
            if (this.type === 'card') option.textContent = 'New Card';
            if (this.type === 'bank_accounts') option.textContent = 'New Bank account';
            optionsWrapper.appendChild(option);

            Object.values(savedCredentials).forEach((credential, index) => {
                const option = document.createElement('li');
                option.textContent = credential.title;
                optionsWrapper.appendChild(option);
            });

            optionsWrapper.style.overflowY = optionsWrapper.offsetHeight < 206 ? 'auto' : 'scroll'

            value.addEventListener('click', function () {
                select.classList.toggle('-open')
            })

            document.addEventListener('click', function (e) {
                if (!e.composedPath().includes(select)) {
                    select.classList.remove('-open')
                }
            })

            let timerLeave = null
            select.onmouseenter = () => clearTimeout(timerLeave);
            select.onmouseleave = () => {
                timerLeave = setTimeout(() => {
                    select.classList.remove('-open')
                }, 500)
            }

            // init click on option

            const widget = this.widget;
            const type = this.type;
            value = widgetContainer.querySelector('.value');
            select = widgetContainer.querySelector('.select');
            const options = widgetContainer.querySelectorAll('.select li');

            options.forEach((currentElement) => {
                const clickOptionHandler = () => {
                    value.innerText = currentElement.textContent;
                    select.classList.remove('-open')

                    Object.values(savedCredentials).forEach((credential, index) => {
                        if (type === 'card' && currentElement.textContent === 'New Card') {
                            widgetContainer.classList.remove('selected-saved-card');
                            this.vaultToken = undefined;
                        } else if (type === 'bank_accounts' && currentElement.textContent === 'New Bank account') {
                            widget.updateFormValues({
                                account_number: '',
                                account_name: '',
                                account_routing: '',
                            });
                            widgetContainer.classList.remove('selected-saved-bank');
                            this.vaultToken = undefined;
                        } else {
                            if (credential.title.trim() === currentElement.textContent.trim()) {
                                if (type === 'bank_accounts') {
                                    widget.updateFormValues({
                                        account_number: credential?.data?.account_number ?? '',
                                        account_name: credential?.data?.account_name ?? '',
                                        account_routing: credential?.data?.account_routing ?? '',
                                    });
                                    widgetContainer.classList.add('selected-saved-bank');
                                    this.vaultToken = credential.vault_token;
                                    const inputHidden = document.querySelector('[name="payment_source_bank_accounts_token"]');
                                    inputHidden.value = this.vaultToken;
                                }
                                if (type === 'card') {
                                    widgetContainer.classList.add('selected-saved-card');
                                    this.vaultToken = credential.vault_token;
                                    const inputHidden = document.querySelector('[name="payment_source_card_token"]');
                                    inputHidden.value = this.vaultToken;
                                }
                            }
                        }

                    })
                };
                currentElement.addEventListener('click', clickOptionHandler);
            })
        }
    }

    renderSaveCardCheckbox() {
        const widgetContainer = document.querySelector(this.selector);
        const checkbox = document.createElement('label');
        checkbox.classList.add('widget-paydock-checkbox');

        const checkboxEl = widgetContainer.querySelector('.widget-paydock-checkbox');
        if (checkboxEl !== null) return;

        let savePaymentDetailsText = 'Save payment details';

        if (this.type === 'bank_accounts') checkbox.innerHTML = `<input type="checkbox" name="saveBA">&nbsp ${savePaymentDetailsText}`;
        if (this.type === 'card') checkbox.innerHTML = `<input type="checkbox" name="saveCard">&nbsp ${savePaymentDetailsText}`;

        this.widget.on('afterLoad', () => {
            widgetContainer.appendChild(checkbox);
            checkbox.querySelector('input').addEventListener('change', (e) => {
                console.log(`checkbox ${this.type} value: ${e.currentTarget.checked}`)
                this.saveCard = e.currentTarget.checked;
            });
        });
    }

    isSaveCardEnable() {
        return (this.type === 'bank_accounts' && this.configuration.bank_accounts_bank_account_save === 'Enable') ||
            (this.type === 'card' && this.configuration.card_card_save === 'Enable');
    }

    async loadWidget() {
        try {
            await this.loadPayDockScript();
            await this.fetchData();
            if (['bank_accounts', 'card'].includes(this.type)) {
                this.createWidget();
            }
        } catch (error) {
            console.error(error);
        }
    }
}

{/* 
<div id="widget"></div>
<script src="https://api.paydock-commercetool-app.jetsoftpro.dev/paydock-commercetool-widget.js"></script>

<script>
    const paydockCommercetoolsWidget = new PaydockCommercetoolsWidget('#widget', 'bank_accounts', 'userId'); // (selector, type, userId)
    paydockCommercetooslWidget.loadWidget();
</script> 
*/
}
