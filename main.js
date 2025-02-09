"use strict"

/* Individual */
const State = {
  S: "susceptible",
  I: "infectious",
  R: "recovered",
  D: "dead",
  V: "Vaccinated",
}

const Individual = function (state = State.S) {
  this.state = state
}

Individual.prototype.infect = function (rate) {
  if ((this.state == State.S || this.state == State.R || this.state == State.V) && Math.random() <= rate) {
    this.state = State.I
  }
}

Individual.prototype.reinfect = function (rateRecovered, rateVaccinated) {
  if (this.state === State.R && Math.random() <= rateRecovered) {
    this.state = State.I;
  } else if (this.state === State.V && Math.random() <= rateVaccinated) {
    this.state = State.I;
  }
};

Individual.prototype.recover = function (rate) {
  if (this.state == State.I && Math.random() <= rate) {
    this.state = State.R
  }
}

Individual.prototype.dead = function (rate) {
  if (this.state == State.I && Math.random() <= rate) {
    this.state = State.D
  }
}

Individual.prototype.vaccinate = function (rate) {
  if (this.state != State.D && Math.random() <= rate) {
    this.state = State.V
  }
}

/* Stochastic simulation */
let StochasticSimulationDefaultConfig = {
  Nx: 10,
  Ny: 10,
  iRate: 0.1,
  rRate: 0.1,
  vRate: 0.1,
  travelRadius: 3,
  nMeeting: 4,
  percentStartInfected: 0.01,
  dRate: 0,
  maxSteps: 500,
  dotRadius: 8,
  dotPadding: 2,
  colorSusceptible: "rgba(0, 0, 255, .5)",
  colorSusceptibleBg: "rgba(0, 0, 255, .1)",
  colorInfected: "rgba(255, 0, 0, .5)",
  colorInfectedBg: "rgba(255, 0, 0, .1)",
  colorRecovered: "rgba(0, 225, 255, .5)",
  colorRecoveredBg: "rgba(0, 225, 255, .1)",
  colorDead: "rgba(255, 1, 255, .5)",
  colorDeadBg: "rgba(255, 1, 255, .1)",
  colorVaccinated: "rgba(226, 198, 0, .5)",
  colorVaccinatedBg: "rgba(226, 198, 0, .1)",
  timeBetweenSteps: 100,
  reinfectionRateRecovered: 0.05, // Add reinfection rate for recovered individuals
  reinfectionRateVaccinated: 0.02, // Add reinfection rate for vaccinated individuals
}

const StochasticSimulation = function (ctx, config) {
  this.ctx = document.getElementById(ctx)
  this.config = Object.assign(StochasticSimulationDefaultConfig, config)
  this.N = this.config.Nx * this.config.Ny
  this.numStartInfected = 0
  this.individuals = []
  this.infected = []
  this.changedState = []
  this.nSusceptible = []
  this.nInfected = []
  this.nRecovered = []
  this.nDead = []
  this.nVaccinated = []
  this.chart = null
  this.svgArea = null
  this.runInterval = null
}

StochasticSimulation.prototype.setup = function () {
  this.setupSimulation()
  this.setupDraw()
}

StochasticSimulation.prototype.reset = function () {
  this.pause()
  this.setupSimulation()
  this.resetDraw()
}

StochasticSimulation.prototype.step = function () {
  if (this.infected.length != 0) {
    this.stepSimulation()
    this.updateDraw()
  }
}

StochasticSimulation.prototype.run = function () {
  this.runInterval = setInterval(() => {
    if (
      this.infected.length == 0 ||
      this.nInfected.length > this.config.maxSteps
    ) {
      clearInterval(this.runInterval)
    } else {
      this.step()
    }
  }, this.config.timeBetweenSteps)
}

StochasticSimulation.prototype.pause = function () {
  if (this.runInterval != null) {
    clearInterval(this.runInterval)
    this.runInterval = null
  }
}

/* --- Drawing */

function makeSlider(parent, name, min, max, step, getValueCallback, setValueCallback) {
  let container = document.createElement("p")
  container.classList.add("sliderContainer")
  parent.appendChild(container)

  let slider = document.createElement("input")
  slider.type = "range"
  slider.min = min
  slider.max = max
  slider.step = step
  slider.value = getValueCallback()
  container.appendChild(slider)

  slider.addEventListener("input", () => {
    outputSlider.value = slider.value
    setValueCallback(slider.value)
  })

  let label = document.createElement("label")
  container.appendChild(label)
  label.innerHTML = name + " : "

  let outputSlider = document.createElement("output")
  container.appendChild(outputSlider)
  outputSlider.value = getValueCallback()
}

StochasticSimulation.prototype.setupDraw = function () {
  this.ctx.innerHTML = "" // remove everything

  // add sliders and start button
  let inputsArea = document.getElementById("controls")
  inputsArea.innerHTML = "" // clear previous controls

  // Ajouter une case à cocher pour le mode "cluster"
  let clusterCheckbox = document.createElement("input");
  clusterCheckbox.type = "checkbox";
  clusterCheckbox.checked = this.config.clusterMode;
  clusterCheckbox.addEventListener("change", () => {
    this.config.clusterMode = clusterCheckbox.checked;
    this.reset();
  });

  let clusterLabel = document.createElement("label");
  clusterLabel.innerHTML = "Mode Cluster";
  inputsArea.appendChild(clusterLabel);
  inputsArea.appendChild(clusterCheckbox);

  makeSlider(
    inputsArea,
    "Initialement infectés, I(0) (%)",
    0.1,
    10,
    0.1,
    () => {
      return this.config.percentStartInfected * 100
    },
    (value) => {
      this.config.percentStartInfected = value / 100
      this.resetAndRun()
    },
  )

  makeSlider(
    inputsArea,
    "Taux d'infection, β (%)",
    0,
    100,
    1,
    () => {
      return this.config.iRate * 100
    },
    (value) => {
      this.config.iRate = value / 100
    },
  )

  makeSlider(
    inputsArea,
    "Taux de guérison, γ (%)",
    0,
    100,
    1,
    () => {
      return this.config.rRate * 100
    },
    (value) => {
      this.config.rRate = value / 100
    },
  )
  
  makeSlider(
    inputsArea,
    "Taux de Vacciné, v(%)",
    0,
    100,
    1,
    () => {
      return this.config.vRate * 100
    },
    (value) => {
      this.config.vRate = value / 100
    },
  )

  makeSlider(
    inputsArea,
    "Taux de mort, d (%)",
    0,
    100,
    1,
    () => {
      return this.config.dRate * 100
    },
    (value) => {
      this.config.dRate = value / 100
    },
  )

  makeSlider(
    inputsArea,
    "Taux de réinfection (guéris), r (%)",
    0,
    100,
    1,
    () => {
      return this.config.reinfectionRateRecovered * 100;
    },
    (value) => {
      this.config.reinfectionRateRecovered = value / 100;
    }
  );
  
  makeSlider(
    inputsArea,
    "Taux de réinfection (vaccinés), r (%)",
    0,
    100,
    1,
    () => {
      return this.config.reinfectionRateVaccinated * 100;
    },
    (value) => {
      this.config.reinfectionRateVaccinated = value / 100;
    }
  );

  makeSlider(
    inputsArea,
    "Rayon, r<sub>m</sub>",
    1,
    Math.round(
      Math.sqrt(Math.pow(this.config.Nx, 2) + Math.pow(this.config.Ny, 2)),
    ),
    1,
    () => {
      return this.config.travelRadius
    },
    (value) => {
      this.config.travelRadius = value
    },
  )

  makeSlider(
    inputsArea,
    "Rencontres par unité de temps, n<sub>m</sub>",
    1,
    50,
    1,
    () => {
      return this.config.nMeeting
    },
    (value) => {
      this.config.nMeeting = value
    },
  )

  makeSlider(
    inputsArea,
    "Temps maximal",
    200,
    2000,
    100,
    () => {
      return this.config.maxSteps
    },
    (value) => {
      this.config.maxSteps = value
    },
  )

  let startStopButton = document.createElement("input");
  let stepButton = document.createElement("input");
  let resetButton = document.createElement("input");

  startStopButton.type = "button";
  startStopButton.value = "Démarrer";
  startStopButton.addEventListener("click", () => {
    if (this.runInterval == null) {
      startStopButton.value = "Pause";
      stepButton.disabled = true;
      this.run();
    } else {
      startStopButton.value = "Continuer";
      stepButton.disabled = false;
      this.pause();
    }
  });

  stepButton.type = "button";
  stepButton.value = "Faire une étape";
  stepButton.addEventListener("click", () => {
    startStopButton.value = "Continuer";
    if (this.runInterval == null) this.step();
  });

  resetButton.type = "button";
  resetButton.value = "Recommencer";
  resetButton.addEventListener("click", () => {
    this.reset();
    stepButton.disabled = false;
    startStopButton.value = "Commencer";
  });

  let parent = document.createElement("p");
  inputsArea.appendChild(parent);

  parent.appendChild(startStopButton);
  parent.appendChild(stepButton);
  parent.appendChild(resetButton);

  // setup SVG visualisation
  let sz = this.config.dotRadius + this.config.dotPadding;
  this.svgArea = SVG()
    .addTo(this.ctx)
    .size(this.config.Nx * sz, this.config.Ny * sz);

  // setup Chart.js canvas
  let canvas = document.createElement("canvas");
  canvas.id = "simulationChart";
  canvas.width = Math.max(400, this.config.Nx * sz);
  canvas.height = 400;
  this.ctx.appendChild(canvas);

  this.chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Susceptibles",
          data: [],
          borderColor: this.config.colorSusceptible,
          backgroundColor: this.config.colorSusceptibleBg,
        },
        {
          label: "Infectés",
          data: [],
          borderColor: this.config.colorInfected,
          backgroundColor: this.config.colorInfectedBg,
        },
        {
          label: "Guéris",
          data: [],
          borderColor: this.config.colorRecovered,
          backgroundColor: this.config.colorRecoveredBg,
        },
        {
          label: "Morts",
          data: [],
          borderColor: this.config.colorDead,
          backgroundColor: this.config.colorDeadBg,
        },
        {
          label: "Vaccinés",
          data: [],
          borderColor: this.config.colorVaccinated,
          backgroundColor: this.config.colorVaccinatedBg,
        },
      ],
    },
    options: {
      responsive: false,
      scales: {
        xAxes: [
          {
            scaleLabel: {
              display: true,
              labelString: "Unités de temps",
            },
          },
        ],
        yAxes: [
          {
            scaleLabel: {
              display: true,
              labelString: "Quantité (%)",
            },
          },
        ],
      },
      tooltips: {
        callbacks: {
          title: function (tooltipItem, data) {
            return `Après ${tooltipItem[0].label} unité(s) de temps`;
          },
          label: function (tooltipItem, data) {
            let label = data.datasets[tooltipItem.datasetIndex].label || "";

            if (label) {
              label += ": ";
            }
            label += Math.round(tooltipItem.yLabel * 10) / 10 + "%";
            return label;
          },
        },
      },
    },
  });

  this.resetDraw();
};

StochasticSimulation.prototype.resetDraw = function () {
  // reset svg
  let sz = this.config.dotRadius + this.config.dotPadding
  this.svgArea.clear()

  for (let i = 0; i < this.config.Nx; i++) {
    for (let j = 0; j < this.config.Ny; j++) {
      let index = this.toIndex([i, j])
      this.svgArea
        .circle(this.config.dotRadius)
        .attr({
          fill:
            this.individuals[index].state == State.S
              ? this.config.colorSusceptible
              : this.config.colorInfected,
        })
        .move(i * sz, j * sz)
        .addClass(`dot-${index}`)
    }
  }

  // reset graph
  this.chart.data.datasets[0].data = [(this.nSusceptible[0] / this.N) * 100]
  this.chart.data.datasets[1].data = [(this.nInfected[0] / this.N) * 100]
  this.chart.data.datasets[2].data = [(this.nRecovered[0] / this.N) * 100]
  this.chart.data.datasets[3].data = [(this.nDead[0] / this.N) * 100]
  this.chart.data.datasets[4].data = [(this.nVaccinated[0] / this.N) * 100]

  this.chart.data.labels = [0]
  this.chart.update()
}

StochasticSimulation.prototype.updateDraw = function () {
  // Mise à jour des éléments SVG
  this.changedState.forEach((index) => {
    let individual = this.individuals[index];
    this.svgArea.findOne(`.dot-${index}`).attr({
      fill:
        individual.state === State.I
          ? this.config.colorInfected
          : individual.state === State.D
          ? this.config.colorDead
          : individual.state === State.V
          ? this.config.colorVaccinated
          : individual.state === State.R
          ? this.config.colorRecovered
          : this.config.colorSusceptible,
    });
  });

  this.changedState = [];

  // Mise à jour du graphique
  this.chart.data.datasets[0].data.push((this.nSusceptible[0] / this.N) * 100);
  this.chart.data.datasets[1].data.push((this.nInfected[0] / this.N) * 100);
  this.chart.data.datasets[2].data.push((this.nRecovered[0] / this.N) * 100);
  this.chart.data.datasets[3].data.push((this.nDead[0] / this.N) * 100);
  this.chart.data.datasets[4].data.push((this.nVaccinated[0] / this.N) * 100);

  this.chart.data.labels.push(this.chart.data.labels.slice(-1)[0] + 1);
  this.chart.update();
};

/* --- Simulate */
StochasticSimulation.prototype.toGridCoordinates = function (index) {
  // don't check if it falls outside the bonds
  let x = index % this.config.Nx
  return [x, (index - x) / this.config.Nx]
}

StochasticSimulation.prototype.toIndex = function (coo) {
  return coo[1] * this.config.Nx + coo[0] // don't check if it falls outside the bonds
}

StochasticSimulation.prototype.inGrid = function (coo) {
  return (
    coo[0] >= 0 &&
    coo[0] < this.config.Nx &&
    coo[1] >= 0 &&
    coo[1] < this.config.Ny
  )
}

StochasticSimulation.prototype.selectNeighboursOf = function (index) {
  /* Select some neighbours of a given individual

  1. List all possible neighbour (based on the Manhattan distance), but not the one that fall outside the grid ;
  2. Select randomly from the list (if the size of the list is less than required, just return all of them).
  */

  let coo = this.toGridCoordinates(index)
  let neighbours = []

  for (let d = 1; d <= this.config.travelRadius; d++) {
    for (let i = -d; i <= d; i++) {
      // explore all possible x coordinates
      let c = d - Math.abs(i)

      let nc = [coo[0] + i, coo[1] + c]
      if (this.inGrid(nc)) neighbours.push(this.toIndex(nc))

      if (c != 0) {
        nc[1] -= 2 * c // take the opposite y coordinate
        if (this.inGrid(nc)) neighbours.push(this.toIndex(nc))
      }
    }
  }

  if (neighbours.length <= this.config.nMeeting) return neighbours

  let selected = []
  for (let i = 0; i < this.config.nMeeting; i++) {
    let index = parseInt(Math.random() * neighbours.length)
    selected.push(neighbours[index])
    neighbours.splice(index, 1)
  }

  return selected
}

StochasticSimulation.prototype.setupSimulation = function () {
  // create individuals
  this.individuals = [];

  for (let i = 0; i < this.N; i++) this.individuals.push(new Individual());

  // infect some of them
  this.infected = [];
  this.changedState = [];

  this.numStartInfected = Math.round(this.config.percentStartInfected * this.N);

  if (this.config.clusterMode) {
    // Mode "cluster" : placer les infectés dans une même zone
    let clusterCenterX = Math.floor(this.config.Nx / 2);
    let clusterCenterY = Math.floor(this.config.Ny / 2);
    let clusterRadius = Math.floor(Math.sqrt(this.numStartInfected));

    for (let i = 0; i < this.numStartInfected; i++) {
      let x = clusterCenterX + Math.floor(Math.random() * clusterRadius * 2) - clusterRadius;
      let y = clusterCenterY + Math.floor(Math.random() * clusterRadius * 2) - clusterRadius;

      // Assurez-vous que les coordonnées sont dans la grille
      x = Math.max(0, Math.min(this.config.Nx - 1, x));
      y = Math.max(0, Math.min(this.config.Ny - 1, y));

      let index = this.toIndex([x, y]);
      this.individuals[index].state = State.I;
      this.infected.push(index);
      this.changedState.push(index);
    }
  } else {
    // Mode aléatoire : placer les infectés aléatoirement
    for (let i = 0; i < this.numStartInfected; i++) {
      let index = parseInt(Math.floor(Math.random() * this.N));
      this.individuals[index].state = State.I;
      this.infected.push(index);
      this.changedState.push(index);
    }
  }

  // keep the list of numbers for the graph
  this.nSusceptible = [this.N - this.numStartInfected];
  this.nInfected = [this.numStartInfected];
  this.nRecovered = [0];
  this.nDead = [0];
  this.nVaccinated = [0];
};

StochasticSimulation.prototype.stepSimulation = function () {
  if (this.infected.length === 0) return; // Pas d'infectés : simulation terminée

  let newInfected = new Set();
  let newlyInfected = 0;
  let newlyRecovered = 0;
  let newlyDead = 0;
  let newlyVaccinated = 0;

  this.changedState = [];

  // Parcourir une copie de la liste des infectés pour éviter les modifications pendant l'itération
  const currentInfected = [...this.infected];

  currentInfected.forEach((index) => {
    let individual = this.individuals[index];

    // Tenter récupération, décès ou vaccination
    individual.recover(this.config.rRate);
    individual.dead(this.config.dRate);
    individual.vaccinate(this.config.vRate);

    // Gérer les transitions d'état
    if (individual.state === State.D) {
      // Passer de I à D
      this.nInfected[0]--;
      this.nDead[0]++;
      this.changedState.push(index);
      newlyDead++;
      // Retirer de la liste des infectés
      this.infected = this.infected.filter((i) => i !== index);
    } else if (individual.state === State.V) {
      // Passer de I à V
      this.nInfected[0]--;
      this.nVaccinated[0]++;
      this.changedState.push(index);
      newlyVaccinated++;
      // Retirer de la liste des infectés
      this.infected = this.infected.filter((i) => i !== index);
    } else if (individual.state === State.R) {
      // Passer de I à R
      this.nInfected[0]--;
      this.nRecovered[0]++;
      this.changedState.push(index);
      newlyRecovered++;
      // Retirer de la liste des infectés
      this.infected = this.infected.filter((i) => i !== index);
    }

    if (individual.state === State.I) {
      // Toujours infecté : propager l'infection
      this.selectNeighboursOf(index).forEach((neighborIndex) => {
        let neighbor = this.individuals[neighborIndex];
        if (neighbor.state === State.S) {
          neighbor.infect(this.config.iRate);
          if (neighbor.state === State.I) {
            newInfected.add(neighborIndex);
            this.changedState.push(neighborIndex);
            newlyInfected++;
          }
        } else if (neighbor.state === State.R) {
          neighbor.reinfect(this.config.reinfectionRateRecovered, 0);
          if (neighbor.state === State.I) {
            this.nRecovered[0]--; // Décrémenter le compteur des guéris
            newInfected.add(neighborIndex);
            this.changedState.push(neighborIndex);
            newlyInfected++;
          }
        } else if (neighbor.state === State.V) {
          neighbor.reinfect(0, this.config.reinfectionRateVaccinated);
          if (neighbor.state === State.I) {
            this.nVaccinated[0]--; // Décrémenter le compteur des vaccinés
            newInfected.add(neighborIndex);
            this.changedState.push(neighborIndex);
            newlyInfected++;
          }
        }
      });
    }
  });

  // Ajouter les nouveaux infectés sans doublons
  newInfected.forEach((i) => {
    if (!this.infected.includes(i)) {
      this.infected.push(i);
      this.nInfected[0]++;
    }
  });

  // Mettre à jour les comptages dans le graphique
  this.nSusceptible[0] = this.N - this.nInfected[0] - this.nRecovered[0] - this.nDead[0] - this.nVaccinated[0];

  // Assurez-vous que les valeurs ne sont pas négatives
  this.nSusceptible[0] = Math.max(this.nSusceptible[0], 0);
  this.nInfected[0] = Math.max(this.nInfected[0], 0);
  this.nRecovered[0] = Math.max(this.nRecovered[0], 0);
  this.nDead[0] = Math.max(this.nDead[0], 0);
  this.nVaccinated[0] = Math.max(this.nVaccinated[0], 0);

  // Mise à jour du graphique
  this.chart.data.datasets[0].data.push((this.nSusceptible[0] / this.N) * 100);
  this.chart.data.datasets[1].data.push((this.nInfected[0] / this.N) * 100);
  this.chart.data.datasets[2].data.push((this.nRecovered[0] / this.N) * 100);
  this.chart.data.datasets[3].data.push((this.nDead[0] / this.N) * 100);
  this.chart.data.datasets[4].data.push((this.nVaccinated[0] / this.N) * 100);

  this.chart.data.labels.push(this.chart.data.labels.length);
  this.chart.update();
};


// let's go
let simulation = new StochasticSimulation("simulation", {
  Nx: 80,
  Ny: 50,
})
simulation.setup()