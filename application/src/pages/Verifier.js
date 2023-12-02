import { useEffect, useState } from 'react';
import { useDataStateContext, useDataDispatchContext } from "../DataProvider";

import Header from "../components/Header";
import onchain_helpers from "../scripts/dim-onchain-helpers";
import offchain_helpers from "../scripts/dim-offchain-helpers";
import common_helpers from "../scripts/common_helpers";
import { ethers } from "ethers";
import env from "../scripts/environment.json";
import { useSDK } from '@metamask/sdk-react';
import LoadingOverlay from 'react-loading-overlay';

function Verifier() {
    const { MetaMask } = useDataStateContext();

    const dispatch = useDataDispatchContext()
    const [msg, setNotification] = useState("demo");
    const [inputs, setInputs] = useState({ 'tokenId': '' });
    const [verifyResult, setVerifyResult] = useState({});
    const { account } = useSDK();
    const [isActive, setIsActive] = useState(false);

    let ethersProvider = null;

    /*----------------------- CONNECTION ------------------------*/

    const getProvider = () => {
        if (!window.ethereum) {
            console.error("MetaMask provider not found");
            return;
        }

        // Initialize ethers provider
        // if (ethersProvider === null) {
        ethersProvider = new ethers.providers.Web3Provider(window.ethereum);

        return ethersProvider;
    }

    const cmdDisConnect = () => {
        dispatch({ type: "SET_LOGIN", payload: false });
    };

    const handleChange = (event) => {

        const name = event.target.name;
        const value = event.target.value;

        setInputs(values => ({ ...values, [name]: value }))
    };

    /*----------------------- DATA MANIPULATION ------------------------*/

    const cmdVerify = async () => {
        const vierificationId = inputs['tokenId'];
        if (vierificationId.trim().length === 0) {
            alert("You need to input a tokenId to verify first.");
            return;
        }
        const provider = getProvider();
        try {
            setIsActive(true);
            const result = await offchain_helpers.verifyPresentedProof(vierificationId, account, provider);
            console.log("result = ", result);
            if(result === "Proof deleted."){
                alert(result);
                setIsActive(false);
                return;
            }
            setVerifyResult(result);
            setIsActive(false);
        } catch (error) {
            setIsActive(false);
            console.error("Error verifying proof:", error);
        }
    }

    /*----------------------- VIEWS HANDLING ------------------------*/

    const showResultView = () => {
        if (common_helpers.isObjectEmpty(verifyResult)) return <></>
        let result = true;
        const tokenId = verifyResult.tokenId;
        const certificateUID = verifyResult.certificate_uid;
        let isRevoked = verifyResult.isRevoked;
        if (isRevoked) {
            result = false;
            isRevoked = <span><strong>Revoked: </strong><span className="color-fail"><strong>YES</strong></span></span>;
        }
        else
            isRevoked = <span><strong>Revoked: </strong><span className="color-success"><strong>NO</strong></span></span>;
        const signature = verifyResult.signature;
        const signedByAddress = verifyResult.recoverAddress;

        let validIssuer = verifyResult.validIssuer;
        if (validIssuer) {
            validIssuer = <span className="color-success"><strong>The signature is: VALID</strong></span>;
        }
        else {
            result = false;
            validIssuer = <span className="color-fail"><strong>The signature is: INVALID</strong></span>;
        }

        const proofs = verifyResult.proofs;
        // console.log("verifyResult = ", verifyResult);
        // console.log("proofs = ", proofs);
        let proofJSX = [];
        for (const proof of proofs) {
            const attr = proof.attribute;
            const verified = proof.verified;
            proofJSX.push(<span><strong>Attribute: {attr}</strong></span>);
            proofJSX.push(
                <span className={verified ? "color-success" : "color-fail"}>
                    <br /><strong>Verified: {verified ? "YES" : "NO"}</strong>,<br />proof:[
                </span>
            );

            proof.proof.forEach((proofItem, index) => {
                proofJSX.push(
                    <span>
                        {proofItem}{index < proof.proof.length - 1 ? ',' : ''}<br />
                    </span>
                );
            });

            proofJSX.push(<span>]<br /></span>);
        }
        console.log("proofJSX = ", proofJSX);
        if (result)
            result = <span className="color-success"><strong>This proof is: VALID</strong></span>;
        else
            result = <span className="color-fail"><strong>This proof is: INVALID</strong></span>;
        return (
            <div className="row">
                <div className="col-12">
                    <p>
                        <strong>tokenId: {tokenId}</strong><br />
                        {result} <br /> <br />
                        <strong>Details:</strong><br />
                        <strong>Cerificate UID: {certificateUID}</strong><br />
                        {isRevoked}<br />
                        <strong>Signed by: {signedByAddress}</strong><br />
                        <strong>With signature: {signature}</strong><br />
                        {validIssuer}<br />
                    </p>
                    {proofJSX}
                </div>
            </div>
        );
    }

    return (
        <LoadingOverlay
            active={isActive}
            spinner
            text='Please wait...'
        >
            <div className="page">
                <Header title='VERIFIER PAGE' />

                <div className="main">
                    <section className="block" id="verifierBannerHero">
                        <div className="container">
                            <div className="row mb-4">
                                <div className="col-12">
                                    <button className="btn btn-small" onClick={cmdDisConnect}>Disconnect Wallet</button>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-6 col-lg-5 col-xl-4">
                                    <h2 className="title">Welcome</h2>
                                    <p className="color-gray">{MetaMask.account}</p>
                                </div>

                            </div>
                        </div>
                    </section>

                    <section className="block" id="verifierVerify">
                        <div className="container">
                            <div className="row">
                                <div className="col-12">
                                    <h2 className="title">Verifier</h2>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-lg-6">
                                    <h3 className="icon-certificate">Proof details</h3>
                                    <div className="form-group">
                                        <input name='tokenId' onChange={e => handleChange(e)} type="text" className="form-control" placeholder="Input proof Id (tokenId)" />
                                        <button onClick={cmdVerify} className="btn btn-primary">Verify</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="block" id="verifierVerifyResult">
                        <div className="container">
                            {showResultView()}
                        </div>
                    </section>

                    <section className="block" id="pageLog">
                        <div className="container">
                            <div className="row">
                                <div className="col-12">
                                    <pre className="color-blue">
                                        {msg}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </section>

                </div>

            </div>
        </LoadingOverlay >
    );
}

export default Verifier;