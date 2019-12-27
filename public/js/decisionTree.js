'use strict';

// adapted from https://machinelearningmastery.com/implement-decision-tree-algorithm-scratch-python/

Array.prototype.sum = function() {
    return this.reduce((sum, el) => sum + el, 0);
};

function isNumber(n) {
    return !isNaN(n);
}

function getMinOfArray(es, getMinElement) {
    return es.reduce(getMinElement);
}

function splitItemsIntoChunks({
    numItems,
    maxNumChunks
}) {
    const chunks = [];
    const chunkSize = numItems < maxNumChunks ? 1 : Math.floor(numItems / maxNumChunks);
    for (let chunkIndex = 0; chunkIndex < Math.min(maxNumChunks, numItems) - 1; chunkIndex++) {
        chunks.push({
            oneBasedStartIndexOfChunk: chunkIndex * chunkSize + 1,
            oneBasedEndIndexInclusiveOfChunk: (chunkIndex + 1) * chunkSize
        });
    }
    chunks.push({
        oneBasedStartIndexOfChunk: (Math.min(maxNumChunks, numItems) - 1) * chunkSize + 1,
        oneBasedEndIndexInclusiveOfChunk: numItems
    });
    return chunks;
}

const dummyTreeListener = {
    onNodeAdded: node => {},
    onEdgeAdded: (fromNode, toNode) => {},
    onStartSplit: nodeId => {},
    onInnerSplit: ({ nodeId, actualSplitIndex, endSplitIndex }) => {},
    onEndSplit: nodeId => {}
};

class DecisionTreeBuilder {

    constructor(max_depth, min_size, numWorkers, treeListener = dummyTreeListener) {
        this.max_depth = max_depth;
        this.min_size = min_size;
        this.numWorkers = numWorkers;
        this.treeListener = treeListener;
    }

    // Build a decision tree
    build_tree(train, k) {
        this.get_split(
            train,
            root => this.split(root, 1, root => k(prune(root))));
    }

    // Select the best split point for a dataset
    get_split(dataset, k) {
        const nodeId = newId();
        const chunks = splitItemsIntoChunks({
            numItems: getNumberOfAttributes(dataset),
            maxNumChunks: this.numWorkers
        });
        this.get_splits_for_chunks(
            chunks,
            nodeId,
            dataset,
            splits_for_chunks => {
                const [b_index, b_value, b_score, b_groups] =
                getMinOfArray(
                    splits_for_chunks,
                    (
                        [index1, value1, score1, groups1], [index2, value2, score2, groups2]
                    ) => score1 < score2 ? [index1, value1, score1, groups1] : [index2, value2, score2, groups2]);
                k(this._emitOnNodeAdded({
                    id: nodeId,
                    index: b_index,
                    value: b_value,
                    groups: b_groups
                }));
            });
    }

    get_splits_for_chunks(chunks, nodeId, dataset, k) {
        this.treeListener.onStartSplit(nodeId);
        const splits_for_chunks = [];
        for (let i = 0; i < chunks.length; i++) {
            this.get_split_for_chunk(
                i + 1,
                chunks[i],
                nodeId,
                dataset,
                chunk => {
                    splits_for_chunks.push(chunk);
                    if (splits_for_chunks.length == chunks.length) {
                        this.treeListener.onEndSplit(nodeId);
                        k(splits_for_chunks);
                    }
                });
        }
    }

    get_split_for_chunk(workerIndex, chunk, nodeId, dataset, addChunk) {
        const worker = new Worker('js/splitterWorker.js');
        worker.onmessage = event => {
            const { type, value } = event.data;
            switch (type) {
                case 'inner-split':
                    const { nodeId, startSplitIndex, actualSplitIndex, endSplitIndex, numberOfEntriesInDataset } = value;
                    this.treeListener.onInnerSplit({ workerIndex, nodeId, startSplitIndex, actualSplitIndex, endSplitIndex, numberOfEntriesInDataset });
                    break;
                case 'result':
                    addChunk(value);
                    break;
            }
        };
        worker.postMessage({ chunk, nodeId, dataset });
    }

    // Create child splits for a node or make terminal
    split(node, depth, k) {
        let [left, right] = node.groups;
        delete node.groups;
        // check for a no split
        if (left.length == 0 || right.length == 0) {
            node.left = this.to_terminal(left.concat(right));
            this._emitOnEdgeAdded(node, node.left);
            node.right = this.to_terminal(left.concat(right));
            this._emitOnEdgeAdded(node, node.right);
            k(node);
        }
        // check for max depth
        else if (depth >= this.max_depth) {
            node.left = this.to_terminal(left);
            this._emitOnEdgeAdded(node, node.left);
            node.right = this.to_terminal(right);
            this._emitOnEdgeAdded(node, node.right);
            k(node);
        } else {
            const processChild = (child, childName, k) => {
                if (child.length <= this.min_size) {
                    node[childName] = this.to_terminal(child);
                    this._emitOnEdgeAdded(node, node[childName]);
                    k(node);
                } else {
                    this.get_split(child, res => {
                        node[childName] = res;
                        this._emitOnEdgeAdded(node, node[childName]);
                        this.split(node[childName], depth + 1, _ => k(node));
                    });
                }
            }

            processChild(
                left,
                'left',
                _ => processChild(
                    right,
                    'right',
                    k));
        }
    }

    _emitOnNodeAdded(node) {
        this.treeListener.onNodeAdded(node);
        return node;
    }

    _emitOnEdgeAdded(fromNode, toNode) {
        this.treeListener.onEdgeAdded(fromNode, toNode);
    }

    // Create a terminal node value
    to_terminal(group) {
        const outcomes = group.map(getClassValFromRow);
        return this._emitOnNodeAdded({
            id: newId(),
            value: this.getElementWithHighestOccurenceOf(outcomes)
        });
    }

    // https://stackoverflow.com/questions/1053843/get-the-element-with-the-highest-occurrence-in-an-array
    getElementWithHighestOccurenceOf(array) {
        if (array.length == 0) {
            return null;
        }
        let modeMap = {};
        let maxEl = array[0],
            maxCount = 1;
        for (let i = 0; i < array.length; i++) {
            let el = array[i];
            if (modeMap[el] == null) {
                modeMap[el] = 1;
            } else {
                modeMap[el]++;
            }
            if (modeMap[el] > maxCount) {
                maxEl = el;
                maxCount = modeMap[el];
            }
        }

        return maxEl;
    }
}

class Splitter {

    constructor(treeListener) {
        this.treeListener = treeListener;
    }

    get_split_for_chunk({ oneBasedStartIndexOfChunk, oneBasedEndIndexInclusiveOfChunk }, nodeId, dataset) {
        const class_values = getClassValsFromRows(dataset);
        let [b_index, b_value, b_score, b_groups] = [999, 999, 999, undefined];
        for (let index = oneBasedStartIndexOfChunk - 1; index <= oneBasedEndIndexInclusiveOfChunk - 1; index++) {
            this.treeListener.onInnerSplit({ nodeId: nodeId, startSplitIndex: oneBasedStartIndexOfChunk - 1, actualSplitIndex: index, endSplitIndex: oneBasedEndIndexInclusiveOfChunk - 1, numberOfEntriesInDataset: dataset.length });
            for (const row of dataset) {
                const groups = this.test_split(index, row[index], dataset);
                const gini = this.gini_index(groups, class_values);
                if (gini < b_score) {
                    [b_index, b_value, b_score, b_groups] = [index, row[index], gini, groups];
                }
            }
        }
        return [b_index, b_value, b_score, b_groups];
    }

    // Split a dataset based on an attribute and an attribute value
    test_split(index, value, dataset) {
        const left = [];
        const right = [];
        for (const row of dataset) {
            const splitCondition =
                isNumber(value) ?
                Number(row[index]) < Number(value) :
                row[index] == value;
            if (splitCondition) {
                left.push(row);
            } else {
                right.push(row);
            }
        }
        return [left, right];
    }

    // Calculate the Gini index for a split dataset
    gini_index(groups, classes) {
        const getP = group => class_val =>
            group
            .map(getClassValFromRow)
            .filter(classVal => classVal == class_val)
            .length / group.length;

        const getScore = group =>
            classes
            .map(getP(group))
            .map(p => p * p)
            .sum();

        const n_instances =
            groups
            .map(group => group.length)
            .sum();

        const gini =
            groups
            .filter(group => group.length != 0)
            .map(group => (1.0 - getScore(group)) * (group.length / n_instances))
            .sum();

        return gini;
    }
}

function isInnerNode(node) {
    return 'left' in node || 'right' in node;
}

function isTerminalNode(node) {
    return !isInnerNode(node);
}

// Calculate accuracy percentage
function accuracy_percentage(actual, predicted) {
    let correct = 0;
    for (let i = 0; i < actual.length; i++) {
        if (actual[i] == predicted[i]) {
            correct += 1;
        }
    }
    return correct / actual.length * 100.0;
}

function getNumberOfAttributes(dataset) {
    return dataset[0].length - 1;
}

function getClassValFromRow(row) {
    return row[row.length - 1];
}

function getClassValsFromRows(dataset) {
    return Array.from(new Set(dataset.map(getClassValFromRow)));
}

// Print a decision tree
function print_tree(node, attributeNames, depth = 0) {
    if (!node) {
        return;
    }

    if (isInnerNode(node)) {
        console.log(`${' '.repeat(depth)}[${node.id}: ${getNodeContent(node, attributeNames)}]`);
        print_tree(node.left, attributeNames, depth + 1);
        print_tree(node.right, attributeNames, depth + 1);
    } else {
        console.log(`${' '.repeat(depth)}[${node.id}: ${node.value}]`);
    }
}

function getNodeContent(node, attributeNames) {
    return `${attributeNames[node.index]} ${isNumber(node.value) ? '<' : '='} ${node.value}`;
}

// Make a prediction with a decision tree
function predict(node, row) {
    if (!node) {
        return {
            value: null,
            nodes: []
        };
    }

    if (isTerminalNode(node)) {
        return {
            value: node.value,
            nodes: [node]
        };
    }

    const splitCondition =
        isNumber(node.value) ?
        Number(row[node.index]) < Number(node.value) :
        row[node.index] == node.value;

    let { value, nodes } = predict(splitCondition ? node.left : node.right, row);
    return {
        value: value,
        nodes: [node].concat(nodes)
    };
}

const actualClassVals = fold => fold.map(getClassValFromRow);

function prune(node) {
    let pruneDescr = {
        node: node,
        hasChange: false
    };
    do {
        pruneDescr = _prune(pruneDescr.node);
    } while (pruneDescr.hasChange);

    return pruneDescr.node;
}

function _prune(node) {
    let hasChange = false;

    function prune(node) {
        if (isTerminalNode(node)) {
            return node;
        }

        if (isTerminalNode(node.left) && isTerminalNode(node.right) && node.left.value == node.right.value) {
            hasChange = true;
            return node.left;
        }

        node.left = prune(node.left);
        node.right = prune(node.right);
        return node;
    }

    return {
        node: prune(node),
        hasChange: hasChange
    };
}