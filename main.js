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
  if (this.state == State.S && Math.random() <= rate) {
    this.state = State.I
  }
}

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
  iRate: 0.2,
  rRate: 0.1,
  vRate: 0.1,
  travelRadius: 3,
  nMeeting: 4,
  percentStartInfected: 0.01,
  dRate: 0.1,
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
      return this.config.dRate * 100
    },
    (value) => {
      this.config.dRate = value / 100
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

  let startStopButton = document.createElement("input")
  let stepButton = document.createElement("input")
  let resetButton = document.createElement("input")

  startStopButton.type = "button"
  startStopButton.value = "Démarrer"
  startStopButton.addEventListener("click", () => {
    if (this.runInterval == null) {
      startStopButton.value = "Pause"
      stepButton.disabled = true
      this.run()
    } else {
      startStopButton.value = "Continuer"
      stepButton.disabled = false
      this.pause()
    }
  })

  stepButton.type = "button"
  stepButton.value = "Faire une étape"
  stepButton.addEventListener("click", () => {
    startStopButton.value = "Continuer"
    if (this.runInterval == null) this.step()
  })

  resetButton.type = "button"
  resetButton.value = "Recommencer"
  resetButton.addEventListener("click", () => {
    this.reset()
    stepButton.disabled = false
    startStopButton.value = "Commencer"
  })

  let parent = document.createElement("p")
  inputsArea.appendChild(parent)

  parent.appendChild(startStopButton)
  parent.appendChild(stepButton)
  parent.appendChild(resetButton)

  // setup SVG visualisation
  let sz = this.config.dotRadius + this.config.dotPadding
  this.svgArea = SVG()
    .addTo(this.ctx)
    .size(this.config.Nx * sz, this.config.Ny * sz)

  // setup Chart.js canvas
  let canvas = document.createElement("canvas")
  canvas.id = "simulationChart"
  // canvas.width = Math.max(400, this.config.Nx * sz)
  // canvas.height = 1000
  this.ctx.appendChild(canvas)

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
            return `Après ${tooltipItem[0].label} unité(s) de temps`
          },
          label: function (tooltipItem, data) {
            let label = data.datasets[tooltipItem.datasetIndex].label || ""

            if (label) {
              label += ": "
            }
            label += Math.round(tooltipItem.yLabel * 10) / 10 + "%"
            return label
          },
        },
      },
    },
  })

  this.resetDraw()
}

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
  // update svg
  this.changedState.forEach((index) => {
    let individual = this.individuals[index]
    this.svgArea.findOne(`.dot-${index}`).attr({
      fill:
        individual.state == State.I
          ? this.config.colorInfected
          : individual.state == State.D
          ? this.config.colorDead
          : individual.state == State.V
          ? this.config.colorVaccinated
          : this.config.colorRecovered,
    })
  })

  this.changedState = []

  // update chart
  this.chart.data.datasets[0].data.push(
    (this.nSusceptible.slice(-1)[0] / this.N) * 100,
  )
  this.chart.data.datasets[1].data.push(
    (this.nInfected.slice(-1)[0] / this.N) * 100,
  )
  this.chart.data.datasets[2].data.push(
    (this.nRecovered.slice(-1)[0] / this.N) * 100,
  )
  this.chart.data.datasets[3].data.push(
    (this.nDead.slice(-1)[0] / this.N) * 100,
  )
  this.chart.data.datasets[4].data.push(
    (this.nVaccinated.slice(-1)[0] / this.N) * 100,
  )

  this.chart.data.labels.push(this.chart.data.labels.slice(-1)[0] + 1)
  this.chart.update()
}

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
  this.individuals = []

  for (let i = 0; i < this.N; i++) this.individuals.push(new Individual())

  // infect some of them
  this.infected = []
  this.changedState = []

  this.numStartInfected = Math.round(this.config.percentStartInfected * this.N)

  for (let i = 0; i < this.numStartInfected; i++) {
    let index = parseInt(Math.floor(Math.random() * this.N))
    this.individuals[index].state = State.I
    this.infected.push(index)
    this.changedState.push(index)
  }

  // keep the list of numbers for the graph
  this.nSusceptible = [this.N - this.numStartInfected]
  this.nInfected = [this.numStartInfected]
  this.nRecovered = [0]
  this.nDead = [0]
  this.nVaccinated = [0]
}

StochasticSimulation.prototype.stepSimulation = function () {
  if (this.infected.length == 0) return; // Pas d'infectés : simulation terminée

  let newInfected = [];
  this.changedState = [];
  let newDead = [];
  let newVaccinated = [];
  let newlyInfected = 0;
  let newlyRecovered = 0;
  let newlyDead = 0;
  let newlyVaccinated = 0;

  this.infected.forEach((index) => {
    let individual = this.individuals[index];

    // Tenter récupération, décès ou vaccination
    individual.recover(this.config.rRate);
    individual.dead(this.config.dRate);
    individual.vaccinate(this.config.vRate);

    if (individual.state === State.D) {
      newDead.push(index);
      this.changedState.push(index);
      newlyDead++;
    } else if (individual.state === State.V) {
      newVaccinated.push(index);
      this.changedState.push(index);
      newlyVaccinated++;
    } else if (individual.state === State.R) {
      this.changedState.push(index);
      newlyRecovered++;
    } else if (individual.state === State.I) {
      // Toujours infecté : propager l'infection
      newInfected.push(index);
      this.selectNeighboursOf(index).forEach((neighborIndex) => {
        let neighbor = this.individuals[neighborIndex];
        if (neighbor.state === State.S) {
          neighbor.infect(this.config.iRate);
          if (neighbor.state === State.I) {
            newInfected.push(neighborIndex);
            this.changedState.push(neighborIndex);
            newlyInfected++;
          }
        }
      });
    }
  });

  // Mettre à jour la liste des infectés et les compteurs
  this.infected = newInfected;
  this.nSusceptible.push(this.nSusceptible.slice(-1)[0] - newlyInfected);
  this.nInfected.push(newInfected.length);
  this.nRecovered.push(this.nRecovered.slice(-1)[0] + newlyRecovered);
  this.nDead.push(this.nDead.slice(-1)[0] + newlyDead);
  this.nVaccinated.push(this.nVaccinated.slice(-1)[0] + newlyVaccinated);
};


// let's go
let simulation = new StochasticSimulation("simulation", {
  Nx: 50,
  Ny: 90,
})
simulation.setup()