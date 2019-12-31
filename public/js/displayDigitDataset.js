'use strict';

class DisplayDigitDatasetTemplate {

    constructor(onDigitClickedReceiveRow) {
        this.onDigitClickedReceiveRow = onDigitClickedReceiveRow;
    }

    displayDigitDataset(digitDataset, digitsContainerId) {
        const digitsContainer = document.querySelector('#' + digitsContainerId);
        digitsContainer.innerHTML = '';
        for (let i = 0; i < digitDataset.length; i++) {
            const digit = new Digit();
            digit.setFigcaption(...this._getFigcaption(digitDataset[i]));
            digit.setImage(digitDataset[i]);
            digit.setOnClicked(() => this.onDigitClickedReceiveRow(digitDataset[i]));
            digitsContainer.appendChild(digit.digitElement);
        }
    }

    _getFigcaption(row) {
        throw new Error('You have to build your own figcaption');
    }
}

class DisplayDigitTrainDataset extends DisplayDigitDatasetTemplate {

    constructor() {
        super(row => {});
    }

    _getFigcaption(row) {
        return [getClassValFromRow(row)];
    }
}

function displayDigitTrainDataset(datasetDescription, digitsContainerId) {
    new DisplayDigitTrainDataset()
        .displayDigitDataset(
            datasetDescription.splittedDataset.train,
            digitsContainerId);
}

class DisplayDigitTestDataset extends DisplayDigitDatasetTemplate {

    constructor(tree, onDigitClickedReceiveRow) {
        super(onDigitClickedReceiveRow);
        this.tree = tree;
    }

    _getFigcaption(row) {
        const actualDigit = getClassValFromRow(row);
        const predictedDigit = predict(this.tree, row).value;
        return [predictedDigit, actualDigit != predictedDigit ? 'wrongPrediction' : undefined];
    }
}

function displayDigitTestDataset({ datasetDescription, tree, digitsContainerId, onDigitClickedReceiveRow }) {
    new DisplayDigitTestDataset(tree, onDigitClickedReceiveRow)
        .displayDigitDataset(
            datasetDescription.splittedDataset.test,
            digitsContainerId);
}