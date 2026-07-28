import { BALANCE_DIMENSIONS, SKILLS, TRIBES } from './data.js'
import { getCabinProgram, getCabinSide } from './cabins.js'

const camperVector = (camper) => BALANCE_DIMENSIONS.map(({ key }) => camper[key])
const sum = (values) => values.reduce((total, value) => total + value, 0)
const totalWeight = sum(BALANCE_DIMENSIONS.map(({ weight }) => weight))
const normalizedWeights = BALANCE_DIMENSIONS.map(({ weight }) => weight / totalWeight)
const CATEGORICAL_WEIGHTS = { gender: 2.8, program: 1.1, programGender: 3.4 }
const MAX_SAME_CABIN_PER_TRIBE = 2

function shuffle(values) {
  const copy = [...values]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function balancedCapacities(totalCampers) {
  const baseSize = Math.floor(totalCampers / TRIBES.length)
  const extra = totalCampers % TRIBES.length
  const capacities = Array(TRIBES.length).fill(baseSize)
  shuffle(Array.from({ length: TRIBES.length }, (_, index) => index))
    .slice(0, extra)
    .forEach((index) => { capacities[index] += 1 })
  return capacities
}

function categoricalDeviation(projected, target) {
  const scale = Math.max(Math.sqrt(target), 1)
  const overflow = Math.max(0, projected - Math.ceil(target))
  return ((projected - target) / scale) ** 2 + overflow * 0.2
}

function categoryScore(counts, proportionsMap, capacity, weight) {
  return Object.entries(proportionsMap).reduce((total, [key, proportion]) => {
    const target = proportion * capacity
    return total + weight * categoricalDeviation(counts[key] || 0, target)
  }, 0)
}

function evaluate(teams, globalAverage, ranges, globalProportions) {
  return teams.reduce((score, team) => {
    if (!team.members.length) return score
    const averages = team.sums.map((value) => value / team.members.length)
    const skillScore = averages.reduce((total, value, index) => {
      const deviation = (value - globalAverage[index]) / ranges[index]
      return total + normalizedWeights[index] * deviation ** 2
    }, 0)
    const categoricalScore =
      categoryScore(team.genderCounts, globalProportions.gender, team.capacity, CATEGORICAL_WEIGHTS.gender) +
      categoryScore(team.programCounts, globalProportions.program, team.capacity, CATEGORICAL_WEIGHTS.program) +
      categoryScore(team.programGenderCounts, globalProportions.programGender, team.capacity, CATEGORICAL_WEIGHTS.programGender)
    return score + skillScore + categoricalScore
  }, 0)
}

function countBy(campers, keyGetter) {
  return campers.reduce((counts, camper) => {
    const key = keyGetter(camper)
    if (key) counts[key] = (counts[key] || 0) + 1
    return counts
  }, {})
}

function proportions(counts, total) {
  return Object.fromEntries(Object.entries(counts).map(([key, count]) => [key, count / Math.max(total, 1)]))
}

function categoricalCost(team, camper, globalProportions) {
  const projectedSize = team.members.length + 1
  const capacity = Math.max(team.capacity || projectedSize, projectedSize, 1)
  const gender = camper.gender || ''
  const program = getCabinProgram(camper.cabin)
  const programGender = program && gender ? `${program}:${gender}` : ''
  let cost = 0

  if (gender) {
    const projected = (team.genderCounts[gender] || 0) + 1
    const target = (globalProportions.gender[gender] || 0) * capacity
    cost += CATEGORICAL_WEIGHTS.gender * categoricalDeviation(projected, target)
  }

  if (program) {
    const projected = (team.programCounts[program] || 0) + 1
    const target = (globalProportions.program[program] || 0) * capacity
    cost += CATEGORICAL_WEIGHTS.program * categoricalDeviation(projected, target)
  }

  if (programGender) {
    const projected = (team.programGenderCounts[programGender] || 0) + 1
    const target = (globalProportions.programGender[programGender] || 0) * capacity
    cost += CATEGORICAL_WEIGHTS.programGender * categoricalDeviation(projected, target)
  }

  return cost
}

function cabinCount(team, camper) {
  if (!camper.cabin) return 0
  return team.cabinCounts[camper.cabin] || 0
}

function addToTeam(team, camper, vector) {
  team.members.push(camper)
  team.sums = team.sums.map((value, index) => value + vector[index])
  if (camper.gender) team.genderCounts[camper.gender] = (team.genderCounts[camper.gender] || 0) + 1
  const program = getCabinProgram(camper.cabin)
  if (program) team.programCounts[program] = (team.programCounts[program] || 0) + 1
  if (program && camper.gender) {
    const programGender = `${program}:${camper.gender}`
    team.programGenderCounts[programGender] = (team.programGenderCounts[programGender] || 0) + 1
  }
  if (camper.cabin) team.cabinCounts[camper.cabin] = (team.cabinCounts[camper.cabin] || 0) + 1
}

function rebuildTeamStats(team, dimensionCount) {
  team.sums = Array(dimensionCount).fill(0)
  team.genderCounts = {}
  team.programCounts = {}
  team.programGenderCounts = {}
  team.cabinCounts = {}
  team.members.forEach((camper) => {
    const vector = camperVector(camper)
    team.sums = team.sums.map((value, index) => value + vector[index])
    if (camper.gender) team.genderCounts[camper.gender] = (team.genderCounts[camper.gender] || 0) + 1
    const program = getCabinProgram(camper.cabin)
    if (program) team.programCounts[program] = (team.programCounts[program] || 0) + 1
    if (program && camper.gender) {
      const programGender = `${program}:${camper.gender}`
      team.programGenderCounts[programGender] = (team.programGenderCounts[programGender] || 0) + 1
    }
    if (camper.cabin) team.cabinCounts[camper.cabin] = (team.cabinCounts[camper.cabin] || 0) + 1
  })
}

function canSwapInto(team, outgoing, incoming) {
  if (!incoming.cabin) return true
  const current = team.cabinCounts[incoming.cabin] || 0
  const outgoingOffset = outgoing.cabin === incoming.cabin ? 1 : 0
  return current - outgoingOffset < MAX_SAME_CABIN_PER_TRIBE
}

function improveWithSwaps(teams, globalAverage, ranges, globalProportions, dimensionCount) {
  let currentScore = evaluate(teams, globalAverage, ranges, globalProportions)
  for (let pass = 0; pass < 3; pass += 1) {
    let improved = false
    for (let leftIndex = 0; leftIndex < teams.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < teams.length; rightIndex += 1) {
        const left = teams[leftIndex]
        const right = teams[rightIndex]
        for (let leftMemberIndex = 0; leftMemberIndex < left.members.length; leftMemberIndex += 1) {
          for (let rightMemberIndex = 0; rightMemberIndex < right.members.length; rightMemberIndex += 1) {
            const leftMember = left.members[leftMemberIndex]
            const rightMember = right.members[rightMemberIndex]
            if (!canSwapInto(left, leftMember, rightMember) || !canSwapInto(right, rightMember, leftMember)) continue

            left.members[leftMemberIndex] = rightMember
            right.members[rightMemberIndex] = leftMember
            rebuildTeamStats(left, dimensionCount)
            rebuildTeamStats(right, dimensionCount)

            const nextScore = evaluate(teams, globalAverage, ranges, globalProportions)
            if (nextScore + 0.000001 < currentScore) {
              currentScore = nextScore
              improved = true
            } else {
              left.members[leftMemberIndex] = leftMember
              right.members[rightMemberIndex] = rightMember
              rebuildTeamStats(left, dimensionCount)
              rebuildTeamStats(right, dimensionCount)
            }
          }
        }
      }
    }
    if (!improved) break
  }
  return teams
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
  const globalProportions = {
    gender: proportions(countBy(campers, ({ gender }) => gender), campers.filter(({ gender }) => gender).length),
    program: proportions(countBy(campers, ({ cabin }) => getCabinProgram(cabin)), campers.filter(({ cabin }) => getCabinProgram(cabin)).length),
    programGender: proportions(
      countBy(campers, ({ cabin, gender }) => {
        const program = getCabinProgram(cabin)
        return program && gender ? `${program}:${gender}` : ''
      }),
      campers.filter(({ cabin, gender }) => getCabinProgram(cabin) && gender).length,
    ),
  }
  let best = null

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const capacities = balancedCapacities(campers.length)
    const teams = TRIBES.map((tribe, index) => ({ ...tribe, members: [], sums: Array(dimensionCount).fill(0), capacity: capacities[index], genderCounts: {}, programCounts: {}, programGenderCounts: {}, cabinCounts: {} }))
    const order = campers
      .map((camper, index) => ({ camper, vector: vectors[index], distance: sum(vectors[index].map((value, dimension) => normalizedWeights[dimension] * ((value - globalAverage[dimension]) / ranges[dimension]) ** 2)) + Math.random() * 0.008 }))
      .sort((a, b) => b.distance - a.distance)

    order.forEach(({ camper, vector }) => {
      const camperSide = getCabinSide(camper.cabin)
      let candidates = teams.filter((team) => team.members.length < team.capacity && cabinCount(team, camper) < MAX_SAME_CABIN_PER_TRIBE)
      if (!candidates.length) candidates = teams.filter((team) => team.members.length < team.capacity)
      if (!candidates.length) candidates = teams.filter((team) => cabinCount(team, camper) < MAX_SAME_CABIN_PER_TRIBE)
      if (!candidates.length) candidates = teams
      let chosen = candidates[0]
      let chosenCost = Number.POSITIVE_INFINITY
      candidates.forEach((team) => {
        const projected = team.sums.map((value, index) => value + vector[index])
        const capacity = Math.max(team.capacity, team.members.length + 1, 1)
        const target = globalAverage.map((value) => value * capacity)
        const mismatch = sum(projected.map((value, index) => normalizedWeights[index] * ((value - target[index]) / (ranges[index] * capacity)) ** 2))
        const fillBonus = team.members.length / Math.max(team.capacity, 1) * 0.018
        const cabinPenalty = camper.cabin && cabinCount(team, camper) ? 0.035 : 0
        const sidePenalty = camperSide && team.side !== camperSide ? 0.08 : 0
        const cost = mismatch + categoricalCost(team, camper, globalProportions) + fillBonus + cabinPenalty + sidePenalty + Math.random() * 0.001
        if (cost < chosenCost) { chosen = team; chosenCost = cost }
      })
      addToTeam(chosen, camper, vector)
    })

    const score = evaluate(teams, globalAverage, ranges, globalProportions)
    if (!best || score < best.score) best = { score, teams }
  }

  const improvedTeams = improveWithSwaps(best.teams, globalAverage, ranges, globalProportions, dimensionCount)
  return improvedTeams.map(({ name, flagCode, flagUrl, color, side, members }) => ({ name, flagCode, flagUrl, color, side, members }))
}

export function getBalanceScore(teams, campers) {
  if (!campers.length || !teams.some((team) => team.members.length)) return 0
  const deviations = BALANCE_DIMENSIONS.map(({ key }, index) => {
    const global = sum(campers.map((camper) => camper[key])) / campers.length
    const range = key === 'age' ? Math.max(...campers.map((camper) => camper.age)) - Math.min(...campers.map((camper) => camper.age)) || 1 : 5
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
