import "./modal.css" // We'll define this later for styling

import { useI } from "atom.io/react"
import React, { useEffect, useRef } from "react"
import ReactDOM from "react-dom"

import { modalViewAtom } from "~/src/lib/view"

interface ModalProps {
	title?: string
	isOpen: boolean
	children: React.ReactNode
	noClose?: boolean
}

const Modal: React.FC<ModalProps> = ({ isOpen, title, children, noClose }) => {
	const setModalView = useI(modalViewAtom)
	const ignoreFirstClick = useRef(true)

	useEffect(() => {
		const handleClick = () => {
			if (ignoreFirstClick.current) {
				ignoreFirstClick.current = false
				return
			}
			setModalView(null)
		}

		if (noClose && isOpen) {
			ignoreFirstClick.current = true
			window.addEventListener(`click`, handleClick)
		}

		return () => {
			window.removeEventListener(`click`, handleClick)
		}
	}, [noClose, isOpen])

	if (!isOpen) return null
	const titleElement = title ? <h1 className="modal-title">{title}</h1> : null
	return ReactDOM.createPortal(
		<div className="modal-overlay">
			<div className={noClose ? `` : `modal-content`}>
				{titleElement}
				{noClose ? null : (
					<button
						type="button"
						className="modal-close"
						onClick={() => {
							setModalView(null)
						}}
					>
						<img src="./close-icon.svg" alt="close" />
					</button>
				)}
				{children}
			</div>
		</div>,
		document.getElementById(`modal-root`) as HTMLElement,
	)
}

export default Modal
