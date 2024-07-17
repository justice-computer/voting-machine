import "./candidateDetail.css"

import type { Candidate } from "../../types"

type CandidateDetailProps = {
	candidate: Candidate | null
	handleVote: (vote: number | null) => void
}

function CandidateDetail({ candidate, handleVote }: CandidateDetailProps): JSX.Element | null {
	if (candidate == null) return null
	return (
		<div className="candidateDetail">
			<img src={candidate.avatar ?? `./avatar.png`} alt="avatar" />
			<div className="info">
				<h2>{candidate.name}</h2>
				<h3>{candidate.heading}</h3>
				<p>{candidate.details}</p>
			</div>
			<div className="icons">
				<button
					type="button"
					onClick={() => {
						handleVote(1)
					}}
				>
					<img className="first" src="./one-icon.svg" alt="one" />
				</button>
				<button
					type="button"
					onClick={() => {
						handleVote(2)
					}}
				>
					<img className="second" src="./two-icon.svg" alt="two" />
				</button>
				<button
					type="button"
					onClick={() => {
						handleVote(3)
					}}
				>
					<img className="third" src="./three-icon.svg" alt="three" />
				</button>
				<button
					type="button"
					onClick={() => {
						handleVote(null)
					}}
				>
					<img className="cancel" src="./cancel-icon.svg" alt="cancel" />
				</button>
			</div>
		</div>
	)
}

export default CandidateDetail
