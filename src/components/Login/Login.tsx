import "./login.css"

import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import type { ChangeEvent } from "react"
import { useState } from "react"
import { toast } from "react-toastify"

import { auth, db } from "../../lib/firebase"
import { uploadImage } from "../../lib/upload"
import type { AvatarImage, SystemUser } from "../../types"

const initialImage: AvatarImage = {
	file: null,
	url: ``,
}

type ProvideCredentialsProps = {
	handleLogin: (e: any) => Promise<void>
}

function ProvideCredentials({ handleLogin }: ProvideCredentialsProps) {
	return (
		<div className="item">
			<h2>Welcome back,</h2>
			<form onSubmit={handleLogin}>
				<input type="text" placeholder="Email" name="email" />
				<input type="password" placeholder="Password" name="password" />
				<button type="submit">Login</button>
			</form>
		</div>
	)
}

type RegisterProps = {
	handleRegister: (e: any) => Promise<void>
	avatarImage: AvatarImage
	handleAvatar: (e: ChangeEvent<HTMLInputElement>) => void
}

function Register({ handleRegister, avatarImage, handleAvatar }: RegisterProps) {
	return (
		<div className="item">
			<h2>Create an account</h2>
			<form onSubmit={handleRegister}>
				<label htmlFor="file">
					<img alt="avatar" src={avatarImage.url ?? `./avatar.png`} />
					Upload your avatar
				</label>
				<input type="file" id="file" style={{ display: `none` }} onChange={handleAvatar} />
				<input type="text" placeholder="Username" name="username" />
				<input type="text" placeholder="Email" name="email" />
				<input type="password" placeholder="Password" name="password" />
				<button type="submit">Sign up</button>
			</form>
		</div>
	)
}

function Login(): JSX.Element {
	const [signup, setSignup] = useState(true)
	const [avatarImage, setAvatarImage] = useState(initialImage)

	const handleAvatar = (e: ChangeEvent<HTMLInputElement>) => {
		if (e?.target?.files?.length) {
			setAvatarImage({
				file: e.target.files[0],
				url: URL.createObjectURL(e.target.files[0]),
			})
		}
	}

	const handleLogin = async (e: any) => {
		e.preventDefault()
		const email = e.target.email.value
		const password = e.target.password.value
		await signInWithEmailAndPassword(auth, email, password)
	}

	const handleRegister = async (e: any) => {
		e.preventDefault()
		const formData = new FormData(e.target)
		const { username, email, password } = Object.fromEntries(formData)

		try {
			const emailString = email as string
			const passwordString = password as string
			const usernameString = username as string
			const res = await createUserWithEmailAndPassword(auth, emailString, passwordString)
			const user: SystemUser = {
				username: usernameString,
				email: emailString,
				id: res.user.uid,
			}
			if (avatarImage.file) {
				const avatarUrl = await uploadImage(avatarImage.file, res.user.uid)
				if (avatarUrl) {
					user.avatar = avatarUrl
				}
			}
			await setDoc(doc(db, `users`, res.user.uid), user)
			await setDoc(doc(db, `votes`, res.user.uid), {
				voterId: username,
				firstChoice: [],
				secondChoice: [],
				thirdChoice: [],
				finished: false,
			})
			toast.success(`Account created for ${emailString}`)
		} catch (error) {
			console.error(error)
			const anyError = error as any
			toast.error(`Error creating account ${anyError.message}`)
		}
		throw new Error(`Error creating account`)
	}

	return (
		<div className="login">
			{signup ? (
				<Register
					handleRegister={handleRegister}
					handleAvatar={handleAvatar}
					avatarImage={avatarImage}
				/>
			) : (
				<ProvideCredentials handleLogin={handleLogin} />
			)}
			<button
				type="button"
				className="switch-button"
				onClick={() => {
					setSignup(!signup)
				}}
			>
				{signup ? `Already have an account?` : `Create an account`}
			</button>
		</div>
	)
}

export default Login
