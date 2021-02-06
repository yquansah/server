import { Node, Vector3, AbstractMesh } from '@babylonjs/core';
import * as EventEmitter from 'events';

function abs(original: Vector3) {
  const vect = original.clone();
  vect.x = Math.abs(vect.x);
  vect.y = Math.abs(vect.y);
  vect.z = Math.abs(vect.z);
  return vect;
}

function getDimensions(mesh: AbstractMesh) {
  const boundingVectors = mesh.getBoundingInfo().boundingBox.vectorsWorld;
  return abs(boundingVectors[1].subtract(boundingVectors[0]));
}

function getGroupDimensions(node: Node) {
  const descendants = node.getDescendants();
  descendants.push(node);

  const dim = descendants.reduce(([cMax, cMin]: Vector3[], currentNode: Node) => {
    if (currentNode instanceof AbstractMesh) {
      const boundingVectors = currentNode.getBoundingInfo().boundingBox.vectorsWorld;
      if (cMax && cMin) {
        return [
          Vector3.Maximize(cMax, boundingVectors[1]),
          Vector3.Minimize(cMax, boundingVectors[0]),
        ];
      }
      return [boundingVectors[1], boundingVectors[0]];
    }
    return [cMax, cMin];
  }, [null, null]);

  return abs(dim[1].subtract(dim[0]));
}

class StateEmitter extends EventEmitter {}

export { getDimensions, StateEmitter, getGroupDimensions };
