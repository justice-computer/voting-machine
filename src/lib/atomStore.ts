import { atom } from "atom.io"

export const currentElectionIdAtom = atom<string>({
	key: `currentElectionId`,
	default: `current`,
})
