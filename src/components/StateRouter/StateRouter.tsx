import { useO } from "atom.io/react"

import { viewSelector } from "~/src/lib/view"

import List from "../list/List"
import UserBar from "../list/UserBar/UserBar"
import SeeResults from "../SeeResults/SeeResults"
import WaitForVoters from "../WaitForVoters/WaitForVoters"

function NextComponent(): JSX.Element {
	const view = useO(viewSelector)

	switch (view) {
		case `not-started`:
			return <WaitForVoters targetState="voting" />
		case `voting`:
			return <List />
		case `voted`:
			return <WaitForVoters targetState="closed" />
		case `closed`:
			return <SeeResults />
	}
}

function StateRouter(): JSX.Element {
	return (
		<>
			<UserBar />
			<NextComponent />
		</>
	)
}

export default StateRouter
