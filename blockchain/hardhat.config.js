require("@nomicfoundation/hardhat-toolbox");

const DEPLOYER_PRIVATE_KEY = "YOUR PRIVATE KEY";
const GANACHE_RPC_SERVER = "HTTP://127.0.0.1:7545";
const AVALANCHE_FUJI_RPC_SERVER = "https://api.avax-test.network/ext/bc/C/rpc";

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for(const account of accounts) {
    console.log(account.address);
  }
});

module.exports = {
  solidity: "0.8.17",
 
  networks: {
    avalanche_fuji: {
      url: `${AVALANCHE_FUJI_RPC_SERVER}`,
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`]
    },
    
    ganache: {
      url: `${GANACHE_RPC_SERVER}`,
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`]
    }
  }
};
