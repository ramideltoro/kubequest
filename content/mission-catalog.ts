import { missions, type Mission } from "./missions";
import exerciseMissions from "./exercise-missions.json";
export const allMissions: Mission[] = [
  ...missions,
  ...(exerciseMissions as Mission[]),
];
export const findMission = (id: string) => allMissions.find((m) => m.id === id);
export const missionUrl = (m: Mission) =>
  m.exercise
    ? (m.sourceKind === "curriculum"
        ? "/ckad/curriculum/"
        : "/ckad/exercises/") + m.id
    : "/ckad/" + m.id;
