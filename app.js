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
const placeButton = document.getElementById("place");
const addButton = document.getElementById("add");
const chaseButton = document.getElementById("chase");
const fleeButton = document.getElementById("flee");
const wanderButton = document.getElementById("wander");
const parkButton = document.getElementById("park");
const removeButton = document.getElementById("remove");
const forceButton = document.getElementById("force");
const bounceButton = document.getElementById("wallBounce");

const pathButton = document.getElementById("path");
const removePathButton = document.getElementById("removePath");

//COUNTER
const counterLabel = document.getElementById("counter");

//SIZE SELECTOR
const sizeSelect = document.getElementById("ballSize");

//WALL COLLISION VAR
let doesBounce;

//PATH DRAWING ACTIVE VAR
let isDrawingPath;
let clickCounter;

class Ball {
  size = 15;
  location = { x: 0, y: 0 };
  speed = { x: 0, y: 0 };
  acceleration = { x: 0, y: 0 };
  gravity = { x: 0, y: 0.91 };
  maxSpeed = 6;
  maxForce = 0.08;

  wanderTheta = 0;

  desiredSeparation = 70;
  desiredGroupation = 350;

  constructor(x, y, size, desiredGroupation, desiredSeparation) {
    this.location.x = x;
    this.location.y = y;
    this.desiredGroupation = desiredGroupation;
    this.desiredSeparation = desiredSeparation;
    this.size = size;
    ctx.beginPath();
    ctx.arc(this.location.x, this.location.y, this.size, 0, Math.PI * 2);
    ctx.closePath();
    ctx.stroke();
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
    ctx.beginPath();
    ctx.arc(this.location.x, this.location.y, this.size, 0, Math.PI * 2);
    ctx.closePath();
    ctx.stroke();
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

        this.diff = divideVectors(this.diff, this.distance * this.distance);

        this.diff = normalizeVector(this.diff);

        this.sum = addVectors(this.sum, this.diff);
        this.count++;
      }
    }

    if (this.count > 0) {
      this.sum = divideVectors(this.sum, this.count);
      this.sum = normalizeVector(this.sum);
      this.sum = multiplyVectors(this.sum, 3);

      this.steer = subtractVectors(this.sum, this.speed);

      this.addForce(limit(this.steer, this.maxForce));
    }
  }

  group(balls) {
    this.sum = { x: 0, y: 0 };
    this.count = 0;

    for (this.b of balls) {
      this.distance = vectorMagnitude(
        subtractVectors(this.location, this.b.location)
      );

      if (this.b != this && this.distance > this.desiredGroupation) {
        this.diff = subtractVectors(this.b.location, this.location);
        this.diff = normalizeVector(this.diff);

        //this.diff = divideVectors(this.diff, this.distance);

        this.sum = addVectors(this.sum, this.diff);
        this.count++;
      }
    }

    if (this.count > 0) {
      this.sum = divideVectors(this.sum, this.count);
      this.sum = normalizeVector(this.sum);

      this.sum = multiplyVectors(this.sum, 2);

      this.steer = subtractVectors(this.sum, this.speed);

      this.addForce(limit(this.steer, this.maxForce));
    }
  }

  wander() {
    this.wanderCircleRadius = 300; //BILO 300
    this.wanderCircleDistance = 50; //BILO 50
    this.changeInterval = 30; //BILO 30, 50 JE TAKODJE DOBRO
    this.wanderTheta +=
      Math.random() * this.changeInterval - this.changeInterval;

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
    } else if (this.location.y - this.size > height) {
      this.location.y = 0;
    } else if (this.location.y < 0) {
      this.location.y = height - this.size;
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

    path_ctx.lineWidth = this.radius * 2;
    path_ctx.strokeStyle = "#78aee3";
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

    return x1 * x1 + y1 * y2;
  }
}
//===========================================================================END VECTOR FUNCTIONS===========================================================================

let ball;
let balls = [];
let cursor;
let isChaseActive;
let isFleeActive;
let isParkingActive;
let isSeparated;
let isGrouped;
let isWandering;
let path;

let once;

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

function addBall() {
  addButton.addEventListener("click", () => {
    once = false;
    let radius = 15;
    switch (sizeSelect.value) {
      case "small":
        radius = 5;
        break;
      case "medium":
        radius = 10;
        break;
      case "large":
        radius = 15;
        break;
    }
    const x = Math.floor(Math.random() * (width - radius * radius) + radius);
    const y = Math.floor(Math.random() * (height - radius * radius) + radius);
    const desiredGroupation = radius * 25;
    const desiredSeparation = radius * 5;

    const b = new Ball(x, y, radius, desiredGroupation, desiredSeparation);

    console.log("DESIRED SEPARATION: " + desiredSeparation);
    console.log("DESIRED GROUPATION: " + desiredGroupation);

    balls.push(b);
    console.log("No of balls is: " + balls.length);
    counterLabel.innerHTML = balls.length;
  });
}

function addForce() {
  forceButton.addEventListener("click", () => {
    for (let b of balls) {
      b.addForce({ x: 0.01, y: 0 });
      console.log(b.acceleration);
    }
  });
}

function removeAllBalls() {
  removeButton.addEventListener("click", () => {
    balls = [];
    counterLabel.innerHTML = balls.length;
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

function drawBalls() {
  if (isChaseActive) {
    for (let b of balls) {
      b.draw();
      b.maxSpeed = 6;
      b.maxForce = 0.08;
      isSeparated ? b.separate(balls) : "";
      isGrouped ? b.group(balls) : "";
      b.seek(cursor.location);
      b.acceleration = multiplyVectors(b.acceleration, 0); // OVO MICE OPCIJU DODAVANJA SILE JER MNOZI UBRZANJE SA NULOM JELTE AKO JE U OVOM ELSE-U TAKO DA JE DOBRO SAD
    }
  } else if (isFleeActive) {
    for (let b of balls) {
      b.draw();
      b.maxSpeed = 6;
      b.maxForce = 0.08;
      isSeparated ? b.separate(balls) : "";
      isGrouped ? b.group(balls) : "";
      b.flee(cursor);
      b.acceleration = multiplyVectors(b.acceleration, 0);
    }
  } else if (isParkingActive) {
    for (let b of balls) {
      b.draw();
      b.maxSpeed = 6;
      b.maxForce = 0.08;
      isSeparated ? b.separate(balls) : "";
      isGrouped ? b.group(balls) : "";
      b.seekAndStop(cursor);
      b.separate(balls);
      b.acceleration = multiplyVectors(b.acceleration, 0);
    }
  } else if (isWandering) {
    for (let b of balls) {
      b.draw();
      b.maxSpeed = 2;
      b.maxForce = 0.05;
      isGrouped ? b.group(balls) : "";
      isSeparated ? b.separate(balls) : "";
      if (!once) {
        b.addForce({ x: 0.00001, y: 0 });
        console.log("UBRZANJE " + JSON.stringify(b.acceleration));
        console.log("SILA DODATA ");
      }
      b.wander();
      b.acceleration = multiplyVectors(b.acceleration, 0);
    }
    once = true;
  } else {
    for (let b of balls) {
      b.draw();
      b.maxSpeed = 6;
      b.maxForce = 0.08;
      isGrouped ? b.group(balls) : "";
      isSeparated ? b.separate(balls) : "";
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
      once = false;
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
}

function setupAll() {
  cursor = new Cursor((width - 15) / 2, (height - 15) / 2, 20, 20);
  path = new Path(55);

  chooseMode();
  toggleChase();
  toggleFlee();
  toggleSeparation();
  toggleParking();
  toggleGrouping();
  toggleWandering();

  toggleWallBounce();
  removeAllBalls();

  drawPath();
  addBall();

  path.remove();
  path.trace();
}

function run() {
  ctx.clearRect(0, 0, width, height);

  cursor.draw();
  path.draw();

  drawBalls();

  requestAnimationFrame(run);
}

setupAll();
run();
