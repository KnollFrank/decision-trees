'use strict';

class KNN {

    constructor(k) {
        this.k = k;
    }

    fit(X, y) {
        this.X = X;
        this.y = y;
    }

    predict(x) {
        return getPredictionFromKNearestNeighbors(this.getKNearestNeighbors(x));
    }

    getKNearestNeighbors(x) {
        const distancesX2x = [];
        for (let i = 0; i < this.X.length; i++) {
            distancesX2x.push({ index: i, distance: getSquaredEuclideanDistance(this.X[i], x) });
        }

        distancesX2x.sort(({ distance: distance1 }, { distance: distance2 }) => distance1 - distance2);

        const k_nearest_neighbors = distancesX2x.slice(0, this.k);

        return k_nearest_neighbors.map(
            ({ index, distance }) =>
            ({
                x: this.X[index],
                y: this.y[index],
                distance: Math.sqrt(distance)
            }));
    }
}

function getSquaredEuclideanDistance(pointA, pointB) {
    return zip(pointA, pointB)
        .map(([coordA, coordB]) => (coordA - coordB) ** 2)
        .sum();
}

function getPredictionFromKNearestNeighbors(kNearestNeighbors) {
    const k_nearest_y2x = kNearestNeighbors.map(({ y }) => y);
    return getElementWithHighestOccurence(k_nearest_y2x);
}