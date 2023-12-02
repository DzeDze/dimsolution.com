const env = require("./environment.json");

async function fetchIPFSData(uri) {
    try {
        const response = await fetch(uri);
        if (!response.ok) {
            throw new Error('Network response was not ok: ' + response.statusText);
        }
        const data = await response.json();
        // console.log(data);
        return data;
    } catch (error) {
        console.error('There has been a problem with your fetch operation:', error);
    }
}

async function uploadFile(fileObj) {
    try {
        const formData = new FormData();
        formData.append('file', fileObj);

        const pinataMetadata = JSON.stringify({ name: fileObj.name });
        formData.append('pinataMetadata', pinataMetadata);

        const response = await fetch(env.PINATA_FILE_PIN_URI, {
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${env.PINATA_JWT}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        return responseData.IpfsHash;
    } catch (error) {
        console.error('Error uploading file:', error);
    }
}

async function uploadJSON(jsonObj) {
    try {

        const data = JSON.stringify(jsonObj);
        const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env.PINATA_JWT}`
            },
            body: data
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        return responseData.IpfsHash;

    } catch (error) {
        console.error('Error uploading JSON:', error);
    }
}

const formatInputsToJSON = (inputs) => {
    const formatted = {};

    // Define the fields in the order they should appear in the JSON
    const fieldsOrder = [
        'certificateCID',
        'issuerAddress',
        'issuerName',
        'certificateTitle',
        'certificateType',
        'certificateDesc',
        'issueDate',
        'expirationDate',
        'authorName',
        'certificateOther',
        'holderUUID',
        'holderName',
        'holderBirthday',
        'holderPhysicalAddress',
        'holderHeight',
        'holderGender',
        'holderOther',
        'file'
    ];

    // Process each field, adding required fields with a default value or optional fields if present
    fieldsOrder.forEach(field => {
        if (field in inputs) {
            // Add the field if it exists in inputs
            formatted[field] = inputs[field];
        } else if (['certificateCID', 'issuerAddress', 'issuerName', 'certificateTitle', 'holderName', 'file'].includes(field)) {
            // Add a default empty string for required fields if not present
            formatted[field] = '';
        }
        // Optional fields are not added if they are not present
    });

    return formatted;
};

function getTimestampInSeconds() {
    return Math.floor(Date.now() / 1000);
}

function convertTimestampToDateString(timestamp) {
    const ts = timestamp * 1000;
    const dateFormat= new Date(ts);
    const day = dateFormat.getDate();
    const month = dateFormat.getMonth();
    const year = dateFormat.getFullYear();
    const date = `${day}/${month}/${year}`;
    
    return date;
}

function isObjectEmpty(objectName) {
    return Object.keys(objectName).length === 0;
}

module.exports = {
    fetchIPFSData,
    uploadFile,
    uploadJSON,
    formatInputsToJSON,
    getTimestampInSeconds,
    convertTimestampToDateString,
    isObjectEmpty
};