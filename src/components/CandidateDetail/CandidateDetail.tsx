import "./candidateDetail.css"

import { useO } from "atom.io/react"

import { candidateDetailViewAtom } from "~/src/lib/view"

function CandidateDetail(): JSX.Element | null {
	const candidate = useO(candidateDetailViewAtom)
	if (candidate == null) return null
	return (
		<div className="candidateDetail">
			<img src={candidate.avatar ?? `./avatar.png`} alt="avatar" />
			<div className="info">
				<h2>{candidate.name}</h2>
				<h3>{candidate.heading}</h3>
				<p>{candidate.details}</p>
			</div>
		</div>
	)
}

export default CandidateDetail
