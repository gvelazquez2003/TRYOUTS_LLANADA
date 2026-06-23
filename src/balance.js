import { BALANCE_DIMENSIONS, SKILLS, TRIBES } from './data.js'

const camperVector = (camper) => BALANCE_DIMENSIONS.map(({ key }) => camper[key])
const sum = (values) => values.reduce((total, value) => total + value, 0)
const totalWeight = sum(BALANCE_DIMENSIONS.map(({ weight }) => weight))
const normalizedWeights = BALANCE_DIMENSIONS.map(({ weight }) => weight / totalWeight)

function shuffle(values) {
  const copy = [...values]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function evaluate(teams, globalAverage, ranges) {
  return teams.reduce((score, team) => {
    if (!team.members.length) return score
    const averages = team.sums.map((value) => value / team.members.length)
    return score + averages.reduce((total, value, index) => {
      const deviation = (value - globalAverage[index]) / ranges[index]
      return total + normalizedWeights[index] * deviation ** 2
    }, 0)
  }, 0)
}

export function balanceCampers(campers) {
  if (!campers.length) return TRIBES.map((tribe) => ({ ...tribe, members: [] }))

  const vectors = campers.map(camperVector)
  const dimensionCount = vectors[0].length
  const globalAverage = Array.from({ length: dimensionCount }, (_, index) =>
    sum(vectors.map((vector) => vector[index])) / campers.length,
  )
  const ranges = Array.from({ length: dimensionCount }, (_, index) => {
    const values = vectors.map((vector) => vector[index])
    return Math.max(Math.max(...values) - Math.min(...values), 1)
  })
  const baseSize = Math.floor(campers.length / TRIBES.length)
  const extra = campers.length % TRIBES.length
  let best = null

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const capacityOrder = shuffle(TRIBES.map((_, index) => index))
    const capacities = Array(TRIBES.length).fill(baseSize)
    capacityOrder.slice(0, extra).forEach((index) => { capacities[index] += 1 })
    const teams = TRIBES.map((tribe, index) => ({ ...tribe, members: [], sums: Array(dimensionCount).fill(0), capacity: capacities[index] }))
    const order = campers
      .map((camper, index) => ({ camper, vector: vectors[index], distance: sum(vectors[index].map((value, dimension) => normalizedWeights[dimension] * ((value - globalAverage[dimension]) / ranges[dimension]) ** 2)) + Math.random() * 0.008 }))
      .sort((a, b) => b.distance - a.distance)

    order.forEach(({ camper, vector }) => {
      const candidates = teams.filter((team) => team.members.length < team.capacity)
      let chosen = candidates[0]
      let chosenCost = Number.POSITIVE_INFINITY
      candidates.forEach((team) => {
        const projected = team.sums.map((value, index) => value + vector[index])
        const target = globalAverage.map((value) => value * team.capacity)
        const mismatch = sum(projected.map((value, index) => normalizedWeights[index] * ((value - target[index]) / (ranges[index] * team.capacity)) ** 2))
        const fillBonus = team.members.length / Math.max(team.capacity, 1) * 0.018
        const cost = mismatch + fillBonus + Math.random() * 0.001
        if (cost < chosenCost) { chosen = team; chosenCost = cost }
      })
      chosen.members.push(camper)
      chosen.sums = chosen.sums.map((value, index) => value + vector[index])
    })

    const score = evaluate(teams, globalAverage, ranges)
    if (!best || score < best.score) best = { score, teams }
  }

  return best.teams.map(({ name, flag, color, members }) => ({ name, flag, color, members }))
}

export function getBalanceScore(teams, campers) {
  if (!campers.length || !teams.some((team) => team.members.length)) return 0
  const deviations = BALANCE_DIMENSIONS.map(({ key }, index) => {
    const global = sum(campers.map((camper) => camper[key])) / campers.length
    const range = key === 'age' ? Math.max(...campers.map((camper) => camper.age)) - Math.min(...campers.map((camper) => camper.age)) || 1 : 4
    const teamDeviation = teams.filter((team) => team.members.length).map((team) => Math.abs(sum(team.members.map((member) => member[key])) / team.members.length - global) / range)
    return (sum(teamDeviation) / Math.max(teamDeviation.length, 1)) * normalizedWeights[index]
  })
  return Math.max(0, Math.round(100 - sum(deviations) * 100))
}

export function teamAverages(members) {
  if (!members.length) return { age: 0, skills: 0 }
  return {
    age: sum(members.map(({ age }) => age)) / members.length,
    skills: sum(members.flatMap((camper) => SKILLS.map(({ key }) => camper[key]))) / (members.length * SKILLS.length),
  }
}
