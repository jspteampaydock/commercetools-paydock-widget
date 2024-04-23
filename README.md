# Paydock Commercetools

Paydock commercetools provides you with the building blocks to create a checkout experience for your shoppers, allowing them to pay using the payment method of their choice.

## Installation

### Node package manager


1. Install the [Paydock Commercetools Node package](https://www.npmjs.com/package/@paydock-commercetools/paydock):

  ```sh
  npm install @paydock-commercetools/paydock

  or

  yarn add @paydock-commercetools/paydock
  ```

2. Import Paydock Commercetools into your application:

  ```js
  import PaydockCommercetoolWidget from import('@paydock-commercetools/paydock');
  import '@paydock-commercetools/paydock/dist/widget.css';
  ```

### Using a <script> tag

You can also import Paydock Commercetools using a `<script>` tag. Download js and css files from [repository](https://gitlab.com/jsp8795506/paydock-commercetools-npm)

Embed the Paydock Commercetools script element above any other JavaScript in your checkout page.

  ```js
  <script src="paydock-commercetools/widget.js"></script>
  ```

Embed the Paydock Commercetools stylesheet. You can add your own styling by overriding the rules in the CSS fil

  ```js
  <link rel="stylesheet" href="paydock-commercetools/widget.css">
  ```

## See also

- [Paydock website](https://paydock.com/)

## License

This repository is available under the [MIT license](LICENSE).
