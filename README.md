# Self-Sovereign Identity - dimsolution.com

In today’s digital age, there is an urgent need for a Digital Identity Management (DIM) system
that allows users to have complete control over their personal information. This system should
empower users to determine the extent of access and duration of third-party access to their data.
Self-Sovereign Identity (SSI) has emerged as a solution to meet these user demands. 

This Proof-of-Concept delves into the use of Non-Fungible Token (NFT) combined with the newly
introduced concept of **Token Bound Account** (TBA - ERC6551) and other relevant EIP such as **SoulboundTokens** (ERC-5484) and **ERC-6147** to establish a DIM solution based on SSI standards. This PoC goes further to
propose practical methods for identity restoration and enhanced user privacy through selective
disclosure. Moreover, it allows users to manage and, if necessary, revoke the information shared
with third parties. 

How to test the solution:

1. Go to blockchain/hardhat.config.js
<<<<<<< HEAD
   Update DEPLOYER_PRIVATE_KEY with your private key
2. Go to application/src/scripts/environment.json
=======
   Update DEPLOYER\_PRIVATE\_KEY with your private key
   
2. Go to application/environment.json
>>>>>>> bdf81a5 (update readme.m)
   Update PINATA_JWT with your JWT
3. Install Node packages for both application and backend
4. Go to blockchain: run npx hardhat run scripts/deploy-contracts.js --network [your prefered network]
5. Go to application: run npm start
6. Enjoy testing ;)
