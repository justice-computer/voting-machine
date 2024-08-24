import "./userBar.css"

import { useI, useO } from "atom.io/react"

import { myselfSelector } from "~/src/lib/auth"
import { currentElectionAtom } from "~/src/lib/election"
import { modalViewAtom } from "~/src/lib/view"

function UserBar(): JSX.Element {
	const myself = useO(myselfSelector)
	const currentElection = useO(currentElectionAtom)
	const setModalView = useI(modalViewAtom)

	return (
		<div className="UserBar">
			<div className="icons">
				<button
					type="button"
					onClick={() => {
						setModalView(`managing-elections`)
					}}
				>
					<img src="./switch-icon.svg" alt="change" />
					{currentElection.name && <p style={{ marginLeft: `10px` }}>{currentElection.name}</p>}
				</button>
			</div>
			<div className="user">
				<h2>{myself?.username}</h2>
				<button
					type="button"
					onClick={() => {
						setModalView(`managing-auth`)
					}}
				>
					<img src={myself?.avatar ?? `./avatar.png`} alt="avatar" />
				</button>
			</div>
		</div>
	)
}

export default UserBar
