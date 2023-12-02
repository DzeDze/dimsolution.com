const hre = require("hardhat");
const fs = require('fs');
const { error } = require("console");
const path = require('path');

async function main() {
    const VerifiableCredential = await hre.ethers.getContractFactory("VerifiableCredential");
    const vc  = await VerifiableCredential.deploy(false);
    await vc.deployed();

    const ERC6551Account = await hre.ethers.getContractFactory("ERC6551Account");
    const tba = await ERC6551Account.deploy();
    await tba.deployed();

    const ERC6551Registry = await hre.ethers.getContractFactory("ERC6551Registry");
    const reg = await ERC6551Registry.deploy(tba.address);
    await reg.deployed();

    const VerifiableProof = await hre.ethers.getContractFactory("VerifiableProof");
    const vp = await VerifiableProof.deploy();
    await vp.deployed();

    console.log("Credential Contract deployed to: ", vc.address);
    console.log("TBA Contract deployed to: ", tba.address);
    console.log("Registry Contract deployed to: ", reg.address);
    console.log("VerifiableProof Contract deployed to: ", vp.address);
    
    const filePath = path.join(__dirname, '../../application/src/scripts/contracts-config.js');
    fs.writeFileSync(filePath, `
    const vc = "${vc.address}";
    const tba = "${tba.address}";
    const reg = "${reg.address}";
    const vp = "${vp.address}";

    module.exports = {
        vc,
        tba,
        reg,
        vp
    };
    `);
}

main()
.then(()=> process.exit(0))
.catch((error) => {
    console.error(error);
    process.exit(1);
})