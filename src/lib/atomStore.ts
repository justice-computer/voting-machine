import { atom } from "atom.io"

export const currentElectionIdAtom = atom<string | null>({
	key: `currentElectionId`,
	default: null,
})

export const currentElectionLabelAtom = atom<string | null>({
	key: `currentElectionLabel`,
	default: null,
})
