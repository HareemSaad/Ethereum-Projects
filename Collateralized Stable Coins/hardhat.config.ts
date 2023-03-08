import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";
dotenv.config()


const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.17',
    settings: {
      optimizer: {
        enabled: true,
      },
    },
  },
  networks: {
    hardhat: {
    },
    // ganache: {
    //   url: process.env.GANACHE_URL,
    //   accounts: [`0x${process.env.PRIVATE_KEY_ONE}`],
    // },
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_KEY_SEPOLIA}`,
      accounts: [`0x${process.env.PRIVATE_KEY}`],
    },
  },
}


export default config;
