import "./candidateDetail.css"

import type { Candidate } from "../../types"

type CandidateDetailProps = {
	candidate: Candidate | null
}

function CandidateDetail({ candidate }: CandidateDetailProps): JSX.Element | null {
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
