import "./candidateDetail.css"

import { useO } from "atom.io/react"

import { candidateDetailViewAtom } from "~/src/lib/view"
const palette = [
	[`#0092db`, `#ffeb00`, `#026937`, `#fcf000`],
	[`#1a2f71`, `#f1e26e`, `#f3e172`, `#333447`],
	[`#212121`, `#c62a38`, `#c03232`, `#f7fffe`],
	[`#0349ac`, `#ff9047`, `#fd9149`, `#082966`],
	[`#1c2220`, `#6e8282`, `#688280`, `#e7a238`],
	[`#013ea6`, `#fffdfc`, `#49883e`, `#fbfff9`],
	[`#05868b`, `#f7f1f5`, `#f5f8f3`, `#df4643`],
	[`#ffba17`, `#5f883a`, `#208ae1`, `#fbfff7`],
	[`#030303`, `#fdfdfd`, `#da3d41`, `#fafffa`],
	[`#384d3e`, `#d0d9df`, `#c9cea9`, `#284337`],
	[`#2d1845`, `#77a0a1`, `#255862`, `#679d96`],
	[`#2b5984`, `#f9fcfb`, `#99abb9`, `#fcfdf8`],
]
function CandidateDetail(): JSX.Element | null {
	const candidate = useO(candidateDetailViewAtom)
	const colors = palette[Math.floor(Math.random() * palette.length)]
	const style = {
		backgroundColor: colors[0],
		width: `100%`,
	}
	if (candidate == null) return null
	return (
		<div className="candidateDetail" style={style}>
			<a href="http:127.0.0.1:5173" rel="noopener noreferrer" className="info">
				<svg
					width="800px"
					height="800px"
					viewBox="0 0 24 24"
					fill={colors[4]}
					xmlns="http://www.w3.org/2000/svg"
				>
					<title>info</title>
					<path
						d="M12 11V16M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
						stroke={colors[3]}
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
					<circle cx="12" cy="7.5" r="1" fill={colors[3]} />
				</svg>
			</a>
			<div className="imageContainer">
				<img src={candidate.avatar ?? `./avatar.png`} alt="avatar" />
				<div className="nameOverlay">
					<h2 style={{ color: colors[1] }}>{candidate.name}</h2>
				</div>
			</div>
			<div className="info">
				<h3 style={{ color: colors[2] }}>{candidate.heading}</h3>
			</div>
		</div>
	)
}

export default CandidateDetail
