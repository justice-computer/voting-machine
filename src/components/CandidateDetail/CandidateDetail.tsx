import "./candidateDetail.css"

import { useO } from "atom.io/react"

import { candidateDetailViewAtom } from "~/src/lib/view"

function CandidateDetail(): JSX.Element | null {
	const candidate = useO(candidateDetailViewAtom)
	if (candidate == null) return null
	return (
		<div className="candidateDetail">
			<div className="imageContainer">
				<img src={candidate.avatar ?? `./avatar.png`} alt="avatar" />
				<div className="nameOverlay">
					<h2>{candidate.name}</h2>
				</div>
			</div>
			<div className="info">
				<h3>{candidate.heading}</h3>
			</div>
		</div>
	)
}

export default CandidateDetail
