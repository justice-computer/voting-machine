import "./addCandidate.css"

import { useO } from "atom.io/react"
import { addDoc, collection, doc, setDoc } from "firebase/firestore"
import type { ChangeEvent } from "react"
import { useState } from "react"

import { db } from "~/src//lib/firebase"
import { currentElectionAtom } from "~/src/lib/election"
import { uploadImage } from "~/src/lib/upload"
import type { AvatarImage } from "~/src/types"

const initialImage: AvatarImage = {
	file: null,
	url: ``,
}

type AddCandidateProps = {
	close: () => void
}

function AddCandidate({ close }: AddCandidateProps): JSX.Element {
	const [avatarImage, setAvatarImage] = useState(initialImage)
	// TODO: get the label from the election
	const currentElection = useO(currentElectionAtom)

	async function handleAdd(e: any) {
		e.preventDefault()
		const { name, heading, details } = e.target.elements
		console.log(currentElection)
		const label = currentElection.label
		const newCandidate: any = {
			id: undefined,
			name: name.value,
			heading: heading.value,
			details: details.value,
			label,
		}
		console.log(newCandidate)
		const candidate = await addDoc(collection(db, `candidates`), newCandidate)
		const avatarUrl = await uploadImage(avatarImage.file as File, candidate.id)
		if (avatarUrl) {
			newCandidate.avatar = avatarUrl
		}
		await setDoc(
			doc(db, `candidates`, candidate.id),
			{ id: candidate.id, avatar: avatarUrl },
			{ merge: true },
		)
		close()
	}

	function handleAvatar(e: ChangeEvent<HTMLInputElement>) {
		if (e?.target?.files?.length) {
			setAvatarImage({
				file: e.target.files[0],
				url: URL.createObjectURL(e.target.files[0]),
			})
		}
	}

	return (
		<div className="addCandidate">
			<form onSubmit={handleAdd}>
				<label htmlFor="name">Name</label>
				<input type="text" placeholder="Jane Smith" name="name" />
				<label htmlFor="heading">Heading</label>
				<input type="text" placeholder="The real deal" name="heading" />
				<label htmlFor="details">Details</label>
				<textarea placeholder="Lorem ipsum…" name="details" />
				<label className="avatar" htmlFor="file">
					<img alt="avatar" src={avatarImage.url ?? `./avatar.png`} />
					Upload your avatar
				</label>
				<input type="file" id="file" style={{ display: `none` }} onChange={handleAvatar} />
				<button type="submit">Add</button>
				<button
					type="button"
					onClick={() => {
						close()
					}}
				>
					Cancel
				</button>
			</form>
		</div>
	)
}

export default AddCandidate
