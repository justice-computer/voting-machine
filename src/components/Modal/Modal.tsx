import "./modal.css" // We'll define this later for styling

import { useI } from "atom.io/react"
import React from "react"
import ReactDOM from "react-dom"

import { modalViewAtom } from "~/src/lib/view"

interface ModalProps {
	title?: string
	isOpen: boolean
	children: React.ReactNode
}

const Modal: React.FC<ModalProps> = ({ isOpen, title, children }) => {
	const setModalView = useI(modalViewAtom)

	if (!isOpen) return null
	const titleElement = title ? <h1 className="modal-title">{title}</h1> : null
	return ReactDOM.createPortal(
		<div className="modal-overlay">
			<div className="modal-content">
				{titleElement}
				<button
					type="button"
					className="modal-close"
					onClick={() => {
						setModalView(null)
					}}
				>
					<img src="./close-icon.svg" alt="close" />
				</button>
				{children}
			</div>
		</div>,
		document.getElementById(`modal-root`) as HTMLElement,
	)
}

export default Modal
