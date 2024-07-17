import "./modal.css" // We'll define this later for styling

import React from "react"
import ReactDOM from "react-dom"

interface ModalProps {
	title?: string
	isOpen: boolean
	onClose: () => void
	children: React.ReactNode
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
	if (!isOpen) return null
	const titleElement = title ? <h1 className="modal-title">{title}</h1> : null
	return ReactDOM.createPortal(
		<div className="modal-overlay">
			<div className="modal-content">
				{titleElement}
				<button type="button" className="modal-close" onClick={onClose}>
					<img src="./close-icon.svg" alt="close" />
				</button>
				{children}
			</div>
		</div>,
		document.getElementById(`modal-root`) as HTMLElement,
	)
}

export default Modal
