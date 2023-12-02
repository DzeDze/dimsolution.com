# dimsolution.com
A SSI Proof-of-Concept
1. Go to blockchain/hardhat.config.js
   Update DEPLOYER_PRIVATE_KEY with your private key
2. Go to application/environment.json
   Update PINATA_JWT with your JWT
3. install Node packages for both application and backend
4. Go to blockchain: run npx hardhat run scripts/deploy-contracts.js --network [your prefered network]
5. Go to application: run npm start
6. Enjoy testing ;)