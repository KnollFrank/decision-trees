'use strict';

class KNNUsingKDTree {

    constructor(k) {
        this.k = k;
    }

    fit(X, y) {
        this.X = X;
        this.y = y;

        const dim = X[0].length;
        const distance = (pointA, pointB) =>
            getSquaredEuclideanDistance(
                pointA.slice(0, dim + 1),
                pointB.slice(0, dim + 1));
        // FK-TODO: extract method copyArray
        const points = new Array(X.length);
        for (let i = 0; i < X.length; i++) {
            points[i] = X[i].slice();
        }
        for (let i = 0; i < y.length; ++i) {
            points[i].push(y[i]);
        }
        this.kdTree = new KDTree(points, distance);
    }

    predict(x) {
        const nearestPoints = this.kdTree.nearest(x, this.k);
        const classIndex = nearestPoints[0][0].length - 1;
        const ys = nearestPoints.map(nearestPoint => nearestPoint[0][classIndex]);
        return getElementWithHighestOccurence(ys);
    }
}

class KNN {

    constructor(k) {
        this.k = k;
    }

    fit(X, y) {
        this.X = X;
        this.y = y;
    }

    predict(x) {
        const distancesX2x = [];
        for (let i = 0; i < this.X.length; i++) {
            distancesX2x.push({ index: i, distance: getSquaredEuclideanDistance(this.X[i], x) });
        }
        distancesX2x.sort((distance1, distance2) => distance1.distance - distance2.distance);
        const k_nearest_y2x = distancesX2x.slice(0, this.k).map(({ index }) => this.y[index]);
        return getElementWithHighestOccurence(k_nearest_y2x);
    }
}

function getSquaredEuclideanDistance(pointA, pointB) {
    return zip(pointA, pointB)
        .map(([coordA, coordB]) => (coordA - coordB) ** 2)
        .sum();
}