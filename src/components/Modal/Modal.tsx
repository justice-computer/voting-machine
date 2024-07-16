import "./modal.css" // We'll define this later for styling

import React from "react"

interface ModalProps {
	title?: string
	isOpen: boolean
	onClose: () => void
	children: React.ReactNode
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
	if (!isOpen) return null
	const titleElement = title ? <h1 className="modal-title">{title}</h1> : null
	return (
		<div className="modal-overlay">
			<div className="modal-content">
				{titleElement}
				<button type="button" className="modal-close" onClick={onClose}>
					<img src="./close-icon.svg" alt="close" />
				</button>
				{children}
			</div>
		</div>
	)
}

export default Modal
