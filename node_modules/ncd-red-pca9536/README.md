# PCA9536

This library provides a class for the PCA9536, it relies on the ncd-red-comm library for communication, and includes a node-red node for the PCA9536. The PCA9536 is an 8-pin CMOS device that provides 4 bits of General Purpose parallel
Input/Output (GPIO) expansion . [Ncd.io](https://ncd.io) manufactures multiple mini-modules that utilize this chip for different applications. You can see a [list here](https://store.ncd.io/?post_type=product&fwp_chip_name=pca9536).

[![PCA9536](./PCA9536.png)](https://store.ncd.io/?post_type=product&fwp_chip_name=pca9536)

### Installation

This library can be installed with npm with the following command:

```
npm install ncd-red-pca9536
```

For use in node-red, use the same command, but inside of your node-red directory (usually `~./node-red`).

### Usage

The `test.js` file included in this library contains basic examples for use.  All of the available configurations are available in the node-red node through the UI.

### Raspberry Pi Notes

If you intend to use this on the Raspberry Pi, you must ensure that:
1. I2C is enabled (there are plenty of tutorials on this that differ based on the Pi version.)
2. Node, NPM, and Node-red should be updated to the LTS versions. If you skip this step the ncd-red-comm dependency may not load properly.
