const app = document.getElementById("app");

//SETUP MAIN CANVAS
const canvas = document.createElement("canvas");
const height = 1000;
const width = 1500;

const ctx = canvas.getContext("2d");

canvas.id = "canvas";
canvas.width = width;
canvas.height = height;
canvas.style.border = "1px solid black";
canvas.style.backgroundColor = "transparent";
canvas.style.position = "absolute";
canvas.style.top = 0;
canvas.style.left = 0;
canvas.style.zIndex = 1;

app.appendChild(canvas);

//SETUP PATH CANVAS
const path_canvas = document.createElement("canvas");
const path_ctx = path_canvas.getContext("2d");
path_canvas.id = "path_canvas";
path_canvas.width = width;
path_canvas.height = height;
path_canvas.style.border = "1px solid black";

path_canvas.style.backgroundColor = "rgb(177, 177, 177)";
path_canvas.style.zIndex = 2;
app.appendChild(path_canvas);

//BUTTONS
const followButton = document.getElementById("follow");
const separateButton = document.getElementById("separate");
const groupButton = document.getElementById("group");
const alignButton = document.getElementById("align");
const placeButton = document.getElementById("place");
const addButton = document.getElementById("add");
const addHundredButton = document.getElementById("add100");
const chaseButton = document.getElementById("chase");
const fleeButton = document.getElementById("flee");
const wanderButton = document.getElementById("wander");
const parkButton = document.getElementById("park");
const removeButton = document.getElementById("remove");
const forceButton = document.getElementById("force");
const bounceButton = document.getElementById("wallBounce");
const avoidButton = document.getElementById("wallAvoid");

const pathButton = document.getElementById("path");
const removePathButton = document.getElementById("removePath");

const ballButton = document.getElementById("ball");
const triangleButton = document.getElementById("triangle");

//COUNTER
const counterLabel = document.getElementById("counter");

//SELECTORS
const sizeSelect = document.getElementById("ballSize");
const FOVSelect = document.getElementById("FOV");

//WALL COLLISION VAR
let doesBounce;
let doesAvoid;

//BOID SHAPE
let isBall = true;
let isTriangle;

//PATH DRAWING ACTIVE VAR
let isDrawingPath;
let clickCounter;

//VIEW ANGLE
let FOV;

class Boid {
  size = 15;
  location = { x: 0, y: 0 };
  speed = { x: 0, y: 0 };
  acceleration = { x: 0, y: 0 };
  gravity = { x: 0, y: 0.91 };
  maxSpeed = 6;
  maxForce = 0.08;

  wanderTheta = 0;

  //TRIANGLE STUFF
  height = 20;
  width = 15;
  trianglePoints = [];

  desiredSeparation = 25;
  desiredGroupation = 350;

  constructor(x, y, size, desiredGroupation, desiredSeparation, height, width) {
    this.location.x = x;
    this.location.y = y;
    this.desiredGroupation = desiredGroupation;
    this.desiredSeparation = desiredSeparation;
    this.size = size;
    this.height = height;
    this.width = width;

    this.trianglePoints = [
      //top
      {
        x: this.location.x - this.width / 2,
        y: this.location.y + this.height / 2,
      },
      //bottom right
      {
        x: this.location.x + this.width / 2,
        y: this.location.y + this.height / 2,
      },
      //bottom left
      { x: this.location.x, y: this.location.y - this.height / 2 },
    ];
    if (isTriangle) {
      ctx.beginPath();
      ctx.moveTo(this.trianglePoints[0].x, this.trianglePoints[0].y);
      ctx.lineTo(this.trianglePoints[2].x, this.trianglePoints[2].y);
      ctx.lineTo(this.trianglePoints[1].x, this.trianglePoints[1].y);
      ctx.lineTo(this.trianglePoints[0].x, this.trianglePoints[0].y);

      console.log(this.trianglePoints[0].x, this.trianglePoints[0].y);
      ctx.closePath();
      ctx.stroke();
      console.log("TRIANGLE");
    } else {
      ctx.beginPath();
      ctx.arc(this.location.x, this.location.y, this.size, 0, Math.PI * 2);

      ctx.closePath();
      ctx.stroke();
    }
  }

  move() {
    this.speed = addVectors(this.speed, this.acceleration);

    //LIMIT SPEED
    if (sqMagnitude(this.speed) > this.maxSpeed * this.maxSpeed) {
      this.speed = normalizeVector(this.speed);
      this.speed = multiplyVectors(this.speed, this.maxSpeed);
    }

    this.location = addVectors(this.location, this.speed);

    if (!doesBounce) {
      this.checkCollision();
    } else {
      this.checkCollisionWrap();
    }

    //console.log(this.maxSpeed);
  }

  draw() {
    if (isTriangle) {
      this.trianglePoints = [
        //top
        {
          x: this.height,
          y: 0,
        },
        //bottom right
        {
          x: 0,
          y: 0 - this.width / 2,
        },
        //bottom left
        { x: 0, y: 0 + this.width / 2 },
      ];

      let angle = Math.atan2(this.speed.y, this.speed.x);
      ctx.save();
      ctx.translate(this.location.x, this.location.y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(this.trianglePoints[0].x, this.trianglePoints[0].y);
      ctx.lineTo(this.trianglePoints[2].x, this.trianglePoints[2].y);
      ctx.lineTo(this.trianglePoints[1].x, this.trianglePoints[1].y);
      ctx.lineTo(this.trianglePoints[0].x, this.trianglePoints[0].y);
      ctx.closePath();

      ctx.stroke();
      ctx.fillStyle = "#308891";
      ctx.fill();

      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(this.location.x, this.location.y, this.size, 0, Math.PI * 2);
      ctx.closePath();

      ctx.stroke();
      ctx.fillStyle = "#308891";
      ctx.fill();
    }
  }

  fall() {
    this.move();
    this.acceleration = this.gravity;
  }

  addForce(force) {
    if (typeof force === "object") {
      this.move();
      this.acceleration = addVectors(this.acceleration, force);
    }
  }

  seekAndStop(cursor) {
    this.desired = subtractVectors(cursor.location, this.location);

    this.distance = vectorMagnitude(this.desired);

    this.desired = normalizeVector(this.desired);

    if (this.distance < 800) {
      this.magnitude = map(this.distance, 0, 800, 0, this.maxSpeed);

      this.desired = multiplyVectors(this.desired, this.magnitude);
    } else {
      this.desired = multiplyVectors(this.desired, this.maxSpeed);
    }

    this.steer = subtractVectors(this.desired, this.speed);

    this.addForce(limit(this.steer, this.maxForce));
    this.move();
  }

  seek(target) {
    this.desired = subtractVectors(target, this.location);
    this.desired = normalizeVector(this.desired);

    this.desired = multiplyVectors(this.desired, this.maxSpeed);

    this.steer = subtractVectors(this.desired, this.speed);

    this.addForce(limit(this.steer, this.maxForce));
    this.move();
  }

  flee(cursor) {
    if (
      vectorMagnitude(subtractVectors(cursor.location, this.location)) <= 150
    ) {
      this.desired = multiplyVectors(
        subtractVectors(cursor.location, this.location),
        -1
      );
      this.desired = normalizeVector(this.desired);

      this.desired = multiplyVectors(this.desired, 2);

      this.steer = subtractVectors(this.desired, this.speed);

      this.addForce(limit(this.steer, this.maxForce));
      this.move();
    }
    this.move();
  }

  separate(balls) {
    this.sum = { x: 0, y: 0 };
    this.count = 0;

    for (this.b of balls) {
      this.distance = vectorMagnitude(
        subtractVectors(this.location, this.b.location)
      );

      if (this.distance > 0 && this.distance < this.desiredSeparation) {
        this.diff = subtractVectors(this.location, this.b.location);

        this.diff = normalizeVector(this.diff);

        this.diff = divideVectors(this.diff, this.distance);

        this.sum = addVectors(this.sum, this.diff);
        this.count++;
      }
    }

    if (this.count > 0) {
      this.sum = divideVectors(this.sum, this.count);
    }

    if (vectorMagnitude(this.sum) > 0) {
      this.sum = normalizeVector(this.sum);
      this.sum = multiplyVectors(this.sum, 2);

      this.steer = subtractVectors(this.sum, this.speed);

      this.addForce(limit(this.steer, this.maxForce));
    }
  }

  group(balls) {
    this.sum = { x: 0, y: 0 };
    this.count = 0;
    let perceptionradius = 100;

    for (this.b of balls) {
      this.distance = vectorMagnitude(
        subtractVectors(this.location, this.b.location)
      );

      if (this.b != this && this.distance < perceptionradius) {
        this.diff = subtractVectors(this.b.location, this.location);
        this.diff = normalizeVector(this.diff);

        this.diff = divideVectors(this.diff, this.distance);

        this.sum = addVectors(this.sum, this.diff);
        this.count++;
      }
    }

    if (this.count > 0) {
      this.sum = divideVectors(this.sum, this.count);
      this.sum = normalizeVector(this.sum);

      this.sum = multiplyVectors(this.sum, 2);

      this.steer = subtractVectors(this.sum, this.speed);

      this.addForce(limit(this.steer, 0.01));
    }
  }

  align(balls) {
    let sum = { x: 0, y: 0 };
    let count = 0;
    let sightDist = 100;
    FOV = setFOV();

    console.log(FOV);

    for (let b of balls) {
      let d = dist(
        this.location.x,
        this.location.y,
        b.location.x,
        b.location.y
      );

      let comparison = subtractVectors(b.location, this.location);

      let diff = Math.atan2(
        comparison.y - this.speed.y,
        comparison.x - this.speed.x
      );

      if (d > 0 && d < sightDist && diff < FOV) {
        sum = addVectors(sum, b.speed);
        count++;
      }
    }

    if (count > 0) {
      sum = divideVectors(sum, count);
      sum = normalizeVector(sum);
      sum = multiplyVectors(sum, 1.5);

      let steer = subtractVectors(sum, this.speed);
      this.addForce(limit(steer, this.maxForce));
    }
  }

  wander() {
    this.wanderCircleRadius = 25; //BILO 300
    this.wanderCircleDistance = 80; //BILO 50
    this.changeInterval = 0.3; //BILO 30, 50 JE TAKODJE DOBRO
    this.wanderTheta +=
      Math.random() * (this.changeInterval * 2) - this.changeInterval;

    //AKO OVO NE RADI INICIJALIZUJ SPEED VEKTOR SA NEKIM BEZVEZE VRIJEDNOSTIMA
    this.circlePosition = this.speed;

    this.circlePosition = normalizeVector(this.circlePosition);
    this.circlePosition = multiplyVectors(
      this.circlePosition,
      this.wanderCircleDistance
    );
    this.circlePosition = addVectors(this.circlePosition, this.location);

    this.h = heading(this.speed);

    this.circleOffset = {
      x: this.wanderCircleRadius * Math.cos(this.wanderTheta + this.h),
      y: this.wanderCircleRadius * Math.sin(this.wanderTheta + this.h),
    };

    this.target = addVectors(this.circlePosition, this.circleOffset);

    this.seek(this.target);
  }

  follow(path) {
    let predict = this.speed;
    predict = normalizeVector(predict);
    predict = multiplyVectors(predict, 50);

    console.log("PREDICT: " + JSON.stringify(predict));

    let predictpos = addVectors(this.location, predict);

    console.log("PREDICTPOS: " + JSON.stringify(predictpos));
    console.log("PATH POINTS: " + JSON.stringify(path.points));

    let target;
    let record = 100000;

    for (let i = 0; i < path.points.length - 1; i++) {
      let a = path.points[i];
      let b = path.points[i + 1];

      this.normalPoint = getNormalPoint(predictpos, a, b);
      if (
        this.normalPoint.x < Math.min(a.x, b.x) ||
        this.normalPoint.x > Math.max(a.x, b.x)
      ) {
        this.normalPoint = b;
      }

      let distance = dist(
        predictpos.x,
        predictpos.y,
        this.normalPoint.x,
        this.normalPoint.y
      );

      if (distance < record) {
        record = distance;

        let dir = subtractVectors(b, a);
        dir = normalizeVector(dir);

        dir = multiplyVectors(dir, 0.5);
        target = this.normalPoint;
        target = addVectors(target, dir);
      }
    }
    if (record > path.radius) {
      this.seek(target);
    }
  }

  checkCollision() {
    if (this.location.x > width || this.location.x < 0) {
      this.speed.x *= -1;
    } else if (this.location.y + this.size >= height || this.location.y < 0) {
      this.speed.y *= -1;
    }
  }

  checkCollisionWrap() {
    if (this.location.x > width) {
      this.location.x = 0;
    } else if (this.location.x < 0) {
      this.location.x = width;
    }

    if (this.location.y - this.size > height) {
      this.location.y = 0;
    } else if (this.location.y < 0) {
      this.location.y = height - this.size;
    }
  }

  avoidWalls() {
    let d = 75;
    let desired = null;

    if (this.location.x < d) {
      desired = { x: this.maxSpeed, y: this.speed.y };
    } else if (this.location.x > width - d) {
      desired = { x: -this.maxSpeed, y: this.speed.y };
    }

    if (this.location.y < d) {
      desired = { x: this.speed.x, y: this.maxSpeed };
    } else if (this.location.y > height - d) {
      desired = { x: this.speed.x, y: -this.maxSpeed };
    }

    if (desired !== null) {
      desired = normalizeVector(desired);

      desired = multiplyVectors(desired, this.maxSpeed);

      let steer = subtractVectors(desired, this.speed);
      this.addForce(limit(steer, this.maxForce));
    }
  }
}

class Cursor {
  location = { x: 0, y: 0 };
  size = { h: 0, w: 0 };
  constructor(x1, y1, height, width) {
    this.location.x = x1;
    this.location.y = y1;

    this.size.h = height;
    this.size.w = width;

    ctx.fillStyle = "black";
    ctx.fillRect(this.location.x, this.location.y, this.size.w, this.size.h);
  }

  move() {
    canvas.style.cursor = "none";
    canvas.addEventListener("mousemove", (e) => {
      this.location.x = e.x;
      this.location.y = e.y;
    });
  }

  draw() {
    ctx.fillStyle = "black";
    ctx.fillRect(this.location.x, this.location.y, this.size.w, this.size.h);
  }

  place() {
    canvas.style.cursor = "pointer";
    canvas.addEventListener("click", (e) => {
      this.location.x = e.x;
      this.location.y = e.y;
    });
  }
}

class Path {
  radius;
  points = [];

  constructor(radius) {
    this.radius = radius;
  }

  trace() {
    this.points = [];
    clickCounter = 1;

    canvas.addEventListener("click", (e) => {
      if (!isDrawingPath) return;
      console.log("KOORDINATE MISA KAD SE KLIKNE: " + e.x + e.y);
      this.points.push({ x: e.x, y: e.y });

      pathButton.innerHTML = "Clicks left: " + (4 - clickCounter);

      if (clickCounter === 4) {
        console.log(
          "BROJAC: " +
            clickCounter +
            "     TACKE U NIZU: " +
            JSON.stringify(this.points)
        );

        pathButton.innerHTML = "Draw path";
        isDrawingPath = false;
      }
      clickCounter++;
    });
  }

  draw() {
    if (this.points.length < 4) {
      return;
    }

    path_ctx.beginPath();

    path_ctx.lineTo(this.points[0].x, this.points[0].y);
    path_ctx.lineTo(this.points[1].x, this.points[1].y);
    path_ctx.lineTo(this.points[2].x, this.points[2].y);
    path_ctx.lineTo(this.points[3].x, this.points[3].y);

    path_ctx.lineWidth = 5;
    path_ctx.strokeStyle = "red";
    path_ctx.lineCap = "round";
    path_ctx.stroke();
  }

  remove() {
    removePathButton.addEventListener("click", () => {
      isDrawingPath = false;
      path_ctx.clearRect(0, 0, width, height);
      this.points = [];
      clickCounter = 1;
    });
  }
}

class Box {
  width = 1400;
  height = 900;
  x = canvas.width / 2 - this.width / 2;
  y = canvas.height / 2 - this.height / 2;
  constructor() {}

  draw() {
    ctx.strokeRect(this.x, this.y, this.width, this.height);
  }
}

//===========================================================================VECTOR FUNCTIONS===========================================================================

function divideVectors(vector, vectorOrNumber) {
  if (typeof vector === "object" && typeof vectorOrNumber === "object") {
    return {
      x:
        vector[Object.keys(vector)[0]] /
        vectorOrNumber[Object.keys(vectorOrNumber)[0]],
      y:
        vector[Object.keys(vector)[1]] /
        vectorOrNumber[Object.keys(vectorOrNumber)[1]],
    };
  } else if (typeof vector === "object" && typeof vectorOrNumber === "number") {
    return {
      x: vector[Object.keys(vector)[0]] / vectorOrNumber,
      y: vector[Object.keys(vector)[1]] / vectorOrNumber,
    };
  }
}

function subtractVectors(vector, vectorOrNumber) {
  if (typeof vector === "object" && typeof vectorOrNumber === "object") {
    return {
      x:
        vector[Object.keys(vector)[0]] -
        vectorOrNumber[Object.keys(vectorOrNumber)[0]],
      y:
        vector[Object.keys(vector)[1]] -
        vectorOrNumber[Object.keys(vectorOrNumber)[1]],
    };
  } else if (typeof vector === "object" && typeof vectorOrNumber === "number") {
    return {
      x: vector[Object.keys(vector)[0]] - vectorOrNumber,
      y: vector[Object.keys(vector)[1]] - vectorOrNumber,
    };
  }
}

function addVectors(vector, vectorOrNumber) {
  if (typeof vector === "object" && typeof vectorOrNumber === "object") {
    return {
      x:
        vector[Object.keys(vector)[0]] +
        vectorOrNumber[Object.keys(vectorOrNumber)[0]],
      y:
        vector[Object.keys(vector)[1]] +
        vectorOrNumber[Object.keys(vectorOrNumber)[1]],
    };
  } else if (typeof vector === "object" && typeof vectorOrNumber === "number") {
    return {
      x: vector[Object.keys(vector)[0]] + vectorOrNumber,
      y: vector[Object.keys(vector)[1]] + vectorOrNumber,
    };
  }
}

function multiplyVectors(vector, vectorOrNumber) {
  if (typeof vector === "object" && typeof vectorOrNumber === "object") {
    return {
      x:
        vector[Object.keys(vector)[0]] *
        vectorOrNumber[Object.keys(vectorOrNumber)[0]],
      y:
        vector[Object.keys(vector)[1]] *
        vectorOrNumber[Object.keys(vectorOrNumber)[1]],
    };
  } else if (typeof vector === "object" && typeof vectorOrNumber === "number") {
    return {
      x: vector[Object.keys(vector)[0]] * vectorOrNumber,
      y: vector[Object.keys(vector)[1]] * vectorOrNumber,
    };
  }
}

function sqMagnitude(v1) {
  let x = v1[Object.keys(v1)[0]];
  let y = v1[Object.keys(v1)[1]];

  return x * x + y * y;
}

function vectorMagnitude(v1) {
  let x = v1[Object.keys(v1)[0]];
  let y = v1[Object.keys(v1)[1]];
  return Math.sqrt(x * x + y * y);
}

function normalizeVector(v1) {
  let magnitude = vectorMagnitude(v1);
  if (magnitude != 0) {
    return divideVectors(v1, magnitude);
  }
  return { x: 0, y: 0 };
}

function limit(vector, max) {
  if (sqMagnitude(vector) > max * max) {
    vector = normalizeVector(vector);
    vector = multiplyVectors(vector, max);

    return vector;
  }
}

function map(value, min1, max1, min2, max2) {
  return min2 + (max2 - min2) * ((value - min1) / (max1 - min1));
}

function heading(v1) {
  if (typeof v1 === "object") {
    let x = v1[Object.keys(v1)[0]];
    let y = v1[Object.keys(v1)[1]];

    return Math.acos(x / Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)));
  }
}

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}

function dot(v1, v2) {
  if (typeof v1 === "object" && typeof v2 === "object") {
    let x1 = v1[Object.keys(v1)[0]];
    let y1 = v1[Object.keys(v1)[1]];

    let x2 = v2[Object.keys(v2)[0]];
    let y2 = v2[Object.keys(v2)[1]];

    return x1 * x2 + y1 * y2;
  }
}

function getNormalPoint(p, a, b) {
  let ap = subtractVectors(p, a);
  let ab = subtractVectors(b, a);

  ab = normalizeVector(ab);

  ab = multiplyVectors(ab, dot(ap, ab));

  // console.log("AP: " + JSON.stringify(ap));
  // console.log("AB: " + JSON.stringify(ab));

  return addVectors(a, ab);
}
//===========================================================================END VECTOR FUNCTIONS===========================================================================

let boid;
let boids = [];
let cursor;
let isChaseActive;
let isFleeActive;
let isParkingActive;
let isSeparated;
let isGrouped;
let isAligned;
let isWandering;
let path;

let box = null;

let onceWander;

function chooseMode() {
  followButton.addEventListener("click", () => {
    cursor = new Cursor((width - 15) / 2, (height - 15) / 2, 20, 20);
    followButton.disabled = true;
    placeButton.disabled = false;
    return cursor.move();
  });

  placeButton.addEventListener("click", () => {
    cursor = new Cursor((width - 15) / 2, (height - 15) / 2, 20, 20);
    followButton.disabled = false;
    placeButton.disabled = true;
    return cursor.place();
  });
}

function chooseBoidShape() {
  ballButton.addEventListener("click", () => {
    isBall = true;
    isTriangle = false;
    ballButton.disabled = true;
    triangleButton.disabled = false;
  });

  triangleButton.addEventListener("click", () => {
    isBall = false;
    isTriangle = true;
    ballButton.disabled = false;
    triangleButton.disabled = true;
  });
}

function addHundredBoids() {
  addHundredButton.addEventListener("click", () => {
    for (let i = 0; i < 100; i++) {
      onceWander = false;
      let radius = 15;
      let w = 15;
      let h = 20;
      switch (sizeSelect.value) {
        case "small":
          radius = 5;
          h = 15;
          w = 10;
          break;
        case "medium":
          radius = 10;
          h = 20;
          w = 15;
          break;
        case "large":
          radius = 15;
          h = 25;
          w = 20;
          break;
      }
      const x = Math.floor(Math.random() * (width - radius * radius) + radius);
      const y = Math.floor(Math.random() * (height - radius * radius) + radius);
      const desiredGroupation = radius * 25;
      const desiredSeparation = radius * 3;

      const b = new Boid(
        x,
        y,
        radius,
        desiredGroupation,
        desiredSeparation,
        h,
        w
      );
      boids.push(b);
      console.log("No of balls is: " + boids.length);
      counterLabel.innerHTML = boids.length;
    }
  });
}

function addBoid() {
  addButton.addEventListener("click", () => {
    onceWander = false;
    let radius = 15;
    let w = 15;
    let h = 20;
    switch (sizeSelect.value) {
      case "small":
        radius = 5;
        h = 15;
        w = 10;
        break;
      case "medium":
        radius = 10;
        h = 20;
        w = 15;
        break;
      case "large":
        radius = 15;
        h = 25;
        w = 20;
        break;
    }
    const x = Math.floor(Math.random() * (width - radius * radius) + radius);
    const y = Math.floor(Math.random() * (height - radius * radius) + radius);
    const desiredGroupation = radius * 25;
    const desiredSeparation = radius * 3;

    const b = new Boid(
      x,
      y,
      radius,
      desiredGroupation,
      desiredSeparation,
      h,
      w
    );

    console.log(b);

    boids.push(b);
    console.log("No of balls is: " + boids.length);
    counterLabel.innerHTML = boids.length;
  });
}

function addForce() {
  forceButton.addEventListener("click", () => {
    for (let b of boids) {
      b.addForce({ x: 0.01, y: 0 });
      console.log(b.acceleration);
    }
  });
}

function removeAllBalls() {
  removeButton.addEventListener("click", () => {
    boids = [];
    counterLabel.innerHTML = boids.length;
    resetToggles();
  });
}

function drawPath() {
  isDrawingPath = false;
  pathButton.addEventListener("click", () => {
    isDrawingPath = true;
    if (isDrawingPath) {
      pathButton.innerHTML = "Select a point on canvas to start";
    }
  });
}

function toggleWallBounce() {
  doesBounce = false;
  bounceButton.addEventListener("click", () => {
    if (doesBounce) {
      doesBounce = false;
      bounceButton.innerHTML = "Turn off wall collision";
      bounceButton.style.backgroundColor = "";
    } else {
      doesBounce = true;
      bounceButton.innerHTML = "Wall collision is OFF";
      bounceButton.style.backgroundColor = "#c93c3c";
    }
  });
}

function toggleWallAvoid() {
  doesAvoid = false;
  avoidButton.addEventListener("click", () => {
    if (doesAvoid) {
      doesAvoid = false;
      removeBox();
      avoidButton.innerHTML = "Turn on wall avoiding";
      avoidButton.style.backgroundColor = "";
    } else {
      doesAvoid = true;
      drawBox();
      avoidButton.innerHTML = "Wall avoiding is ON";
      avoidButton.style.backgroundColor = "#61d44c";
    }
  });
}

function drawBox() {
  box = new Box();
}

function removeBox() {
  box = null;
}

function setFOV() {
  switch (FOVSelect.value) {
    case "30":
      return Math.PI / 6;
    case "45":
      return Math.PI / 4;
    case "60":
      return Math.PI / 3;
    case "90":
      return Math.PI / 2;
    case "180":
      return Math.PI;
    case "270":
      return 3 * (Math.PI / 2);
    case "360":
      return Math.PI * 2;
  }
}

function drawBoids() {
  if (isChaseActive) {
    for (let b of boids) {
      b.draw();
      b.maxSpeed = 6;
      b.maxForce = 0.08;
      isSeparated ? b.separate(boids) : "";
      isGrouped ? b.group(boids) : "";
      isAligned ? b.align(boids) : "";
      doesAvoid ? b.avoidWalls() : "";
      b.seek(cursor.location);
      b.acceleration = multiplyVectors(b.acceleration, 0); // OVO MICE OPCIJU DODAVANJA SILE JER MNOZI UBRZANJE SA NULOM JELTE AKO JE U OVOM ELSE-U TAKO DA JE DOBRO SAD
    }
  } else if (isFleeActive) {
    for (let b of boids) {
      b.draw();
      b.maxSpeed = isGrouped || isAligned ? 0.8 : 2;
      b.maxForce = 0.08;
      isSeparated ? b.separate(boids) : "";
      isGrouped ? b.group(boids) : "";
      isAligned ? b.align(boids) : "";
      doesAvoid ? b.avoidWalls() : "";
      b.flee(cursor);
      b.acceleration = multiplyVectors(b.acceleration, 0);
    }
  } else if (isParkingActive) {
    for (let b of boids) {
      b.draw();
      b.maxSpeed = 6;
      b.maxForce = 0.05;
      isSeparated ? b.separate(boids) : "";
      isGrouped ? b.group(boids) : "";
      isAligned ? b.align(boids) : "";
      doesAvoid ? b.avoidWalls() : "";
      b.seekAndStop(cursor);
      b.separate(boids);
      b.acceleration = multiplyVectors(b.acceleration, 0);
    }
  } else if (isWandering) {
    for (let b of boids) {
      b.draw();
      b.maxSpeed = isGrouped || isAligned ? 0.8 : 2;
      b.maxForce = 0.05;
      isGrouped ? b.group(boids) : "";
      isSeparated ? b.separate(boids) : "";
      isAligned ? b.align(boids) : "";
      if (!onceWander) {
        b.addForce({ x: 0.000000001, y: 0 });
        console.log("UBRZANJE " + JSON.stringify(b.acceleration));
        console.log("SILA DODATA ");
      }
      doesAvoid ? b.avoidWalls() : "";
      b.wander();
      b.acceleration = multiplyVectors(b.acceleration, 0);
    }
    onceWander = true;
  } else {
    for (let b of boids) {
      b.draw();
      b.maxSpeed = 2;
      b.maxForce = 0.05;
      isGrouped ? b.group(boids) : "";
      isSeparated ? b.separate(boids) : "";
      isAligned ? b.align(boids) : "";

      if (path.points.length === 4) {
        b.maxSpeed = 2;
        b.maxForce = 0.05;
        b.follow(path);
      }
      doesAvoid ? b.avoidWalls() : "";
      b.move();

      b.acceleration = multiplyVectors(b.acceleration, 0);
    }
  }
}

function toggleSeparation() {
  isSeparated = false;
  separateButton.addEventListener("click", () => {
    if (isSeparated) {
      isSeparated = false;

      separateButton.innerHTML = "Toggle separation";
      separateButton.style.backgroundColor = "";
    } else {
      isSeparated = true;

      separateButton.innerHTML = "Separation is ON";
      separateButton.style.backgroundColor = "#61d44c";
    }
  });
}

function toggleGrouping() {
  isGrouped = false;
  groupButton.addEventListener("click", () => {
    if (isGrouped) {
      isGrouped = false;

      groupButton.innerHTML = "Toggle grouping";
      groupButton.style.backgroundColor = "";
    } else {
      isGrouped = true;

      groupButton.innerHTML = "Grouping is ON";
      groupButton.style.backgroundColor = "#61d44c";
    }
  });
}

function toggleAlignment() {
  isAligned = false;
  alignButton.addEventListener("click", () => {
    if (isAligned) {
      isAligned = false;

      alignButton.innerHTML = "Toggle alignment";
      alignButton.style.backgroundColor = "";
    } else {
      isAligned = true;

      alignButton.innerHTML = "Alignment is ON";
      alignButton.style.backgroundColor = "#61d44c";
    }
  });
}

function toggleChase() {
  isChaseActive = false;
  chaseButton.addEventListener("click", () => {
    isFleeActive = false;
    isParkingActive = false;
    isWandering = false;

    wanderButton.style.backgroundColor = "";
    wanderButton.innerHTML = "Wander";

    fleeButton.style.backgroundColor = "";
    fleeButton.innerHTML = "Flee";

    parkButton.style.backgroundColor = "";
    parkButton.innerHTML = "Park at suqare";
    if (isChaseActive) {
      isChaseActive = false;
      chaseButton.style.backgroundColor = "";
      chaseButton.innerHTML = "Chase";
      console.log("OFF");
    } else {
      isChaseActive = true;
      console.log("ON");
      chaseButton.style.backgroundColor = "#c93c3c";
      chaseButton.innerHTML = "Chasing";
    }
  });
}

function toggleFlee() {
  isFleeActive = false;
  fleeButton.addEventListener("click", () => {
    isChaseActive = false;
    isParkingActive = false;
    isWandering = false;

    wanderButton.style.backgroundColor = "";
    wanderButton.innerHTML = "Wander";

    chaseButton.style.backgroundColor = "";
    chaseButton.innerHTML = "Chase";

    parkButton.style.backgroundColor = "";
    parkButton.innerHTML = "Park at square";

    if (isFleeActive) {
      isFleeActive = false;
      fleeButton.style.backgroundColor = "";
      fleeButton.innerHTML = "Flee";
      console.log("OFF");
    } else {
      isFleeActive = true;
      console.log("ON");
      fleeButton.style.backgroundColor = "#c93c3c";
      fleeButton.innerHTML = "Fleeing";
    }
  });
}

function toggleParking() {
  isParkingActive = false;
  parkButton.addEventListener("click", () => {
    isFleeActive = false;
    isChaseActive = false;
    isWandering = false;

    wanderButton.style.backgroundColor = "";
    wanderButton.innerHTML = "Wander";

    chaseButton.style.backgroundColor = "";
    chaseButton.innerHTML = "Chase";

    fleeButton.style.backgroundColor = "";
    fleeButton.innerHTML = "Flee";

    wanderButton.style.backgroundColor = "";
    wanderButton.innerHTML = "Wander";

    if (isParkingActive) {
      isParkingActive = false;

      parkButton.style.backgroundColor = "";
      parkButton.innerHTML = "Park at square";

      console.log("OFF");
    } else {
      isParkingActive = true;
      console.log("ON");
      parkButton.style.backgroundColor = "#c93c3c";
      parkButton.innerHTML = "Parking";
    }
  });
}

function toggleWandering() {
  isWandering = false;
  wanderButton.addEventListener("click", () => {
    isFleeActive = false;
    isChaseActive = false;
    isParkingActive = false;

    chaseButton.style.backgroundColor = "";
    chaseButton.innerHTML = "Chase";

    fleeButton.style.backgroundColor = "";
    fleeButton.innerHTML = "Flee";

    parkButton.style.backgroundColor = "";
    parkButton.innerHTML = "Park at square";

    if (isWandering) {
      isWandering = false;

      wanderButton.style.backgroundColor = "";
      wanderButton.innerHTML = "Wander";

      console.log("OFF");
    } else {
      isWandering = true;
      onceWander = false;
      console.log("ON");
      wanderButton.style.backgroundColor = "#c93c3c";
      wanderButton.innerHTML = "Wandering";
    }
  });
}

function resetToggles() {
  isParkingActive = false;
  isFleeActive = false;
  isChaseActive = false;
  isSeparated = false;
  isGrouped = false;
  isWandering = false;
  isAligned = false;

  parkButton.style.backgroundColor = "";
  parkButton.innerHTML = "Park at square";

  fleeButton.style.backgroundColor = "";
  fleeButton.innerHTML = "Flee";

  chaseButton.style.backgroundColor = "";
  chaseButton.innerHTML = "Chase";

  parkButton.style.backgroundColor = "";
  parkButton.innerHTML = "Park at square";

  groupButton.innerHTML = "Toggle grouping";
  groupButton.style.backgroundColor = "";

  separateButton.innerHTML = "Toggle separation";
  separateButton.style.backgroundColor = "";

  wanderButton.style.backgroundColor = "";
  wanderButton.innerHTML = "Wander";

  alignButton.innerHTML = "Toggle alignment";
  alignButton.style.backgroundColor = "";
}

function setupAll() {
  cursor = new Cursor((width - 15) / 2, (height - 15) / 2, 20, 20);
  path = new Path(35);

  chooseBoidShape();
  chooseMode();
  toggleChase();
  toggleFlee();
  toggleSeparation();
  toggleParking();
  toggleGrouping();
  toggleWandering();
  toggleAlignment();

  toggleWallBounce();
  toggleWallAvoid();
  removeAllBalls();

  drawPath();
  addBoid();
  addHundredBoids();
  drawBox();
  removeBox();

  path.remove();
  path.trace();
}

function run() {
  ctx.clearRect(0, 0, width, height);

  cursor.draw();
  path.draw();

  drawBoids();
  if (typeof box !== "undefined" && box != null) box.draw();

  requestAnimationFrame(run);
}

setupAll();
run();
