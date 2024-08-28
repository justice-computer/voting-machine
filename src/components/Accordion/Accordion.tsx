import "./accordion.css"

import React, { useState } from "react"

interface AccordionProps {
	title: string
	children: React.ReactNode
}

const Accordion: React.FC<AccordionProps> = ({ title, children }) => {
	const [isOpen, setIsOpen] = useState(true)

	const toggleAccordion = () => {
		setIsOpen(!isOpen)
	}

	return (
		<div className="accordion">
			<button
				type="button"
				className="accordion-header"
				onClick={toggleAccordion}
				aria-expanded={isOpen}
			>
				<span>{title}</span>
				<span className={`accordion-arrow ${isOpen ? `open` : ``}`}>&#9654;</span>
			</button>
			{isOpen && <div className="accordion-content">{children}</div>}
		</div>
	)
}

export default Accordion
