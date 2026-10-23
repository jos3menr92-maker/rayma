/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
      fontFamily: {
        heading: ['var(--font-heading)'],
        body: ['var(--font-body)'],
      },
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  			  '1': 'hsl(var(--chart-1))',
  			  '2': 'hsl(var(--chart-2))',
  			  '3': 'hsl(var(--chart-3))',
  			  '4': 'hsl(var(--chart-4))',
  			  '5': 'hsl(var(--chart-5))'
  			},
  			success: {
  			  DEFAULT: 'hsl(var(--success))',
  			  foreground: 'hsl(var(--success-foreground))'
  			},
  			warning: {
  			  DEFAULT: 'hsl(var(--warning))',
  			  foreground: 'hsl(var(--warning-foreground))'
  			},
  			info: {
  			  DEFAULT: 'hsl(var(--info))',
  			  foreground: 'hsl(var(--info-foreground))'
  			},
  			// Brand-alignment shims: legacy raw palette shades render with brand tokens
  			amber: {
  			  '100': 'hsl(var(--warning) / 0.18)',
  			  '200': 'hsl(var(--warning) / 0.25)',
  			  '300': 'hsl(var(--warning) / 0.5)',
  			  '400': 'hsl(var(--warning))',
  			  '500': 'hsl(var(--warning))',
  			  '600': 'hsl(var(--warning))',
  			  '700': 'hsl(var(--warning))'
  			},
  			orange: {
  			  '100': 'hsl(var(--warning) / 0.18)',
  			  '300': 'hsl(var(--warning) / 0.5)',
  			  '400': 'hsl(var(--warning))',
  			  '500': 'hsl(var(--warning))',
  			  '600': 'hsl(var(--warning))'
  			},
  			green: {
  			  '100': 'hsl(var(--success) / 0.18)',
  			  '200': 'hsl(var(--success) / 0.25)',
  			  '300': 'hsl(var(--success) / 0.5)',
  			  '400': 'hsl(var(--success))',
  			  '500': 'hsl(var(--success))',
  			  '600': 'hsl(var(--success))',
  			  '700': 'hsl(var(--success))',
  			  '900': 'hsl(var(--success))'
  			},
  			emerald: {
  			  '100': 'hsl(var(--success) / 0.18)',
  			  '400': 'hsl(var(--success))',
  			  '500': 'hsl(var(--success))',
  			  '600': 'hsl(var(--success))',
  			  '700': 'hsl(var(--success))'
  			},
  			blue: {
  			  '300': 'hsl(var(--info) / 0.5)',
  			  '400': 'hsl(var(--info))',
  			  '500': 'hsl(var(--info))',
  			  '600': 'hsl(var(--info))'
  			},
  			cyan: {
  			  '400': 'hsl(var(--primary))',
  			  '600': 'hsl(var(--primary))'
  			},
  			teal: {
  			  '300': 'hsl(var(--primary) / 0.5)',
  			  '400': 'hsl(var(--primary))',
  			  '500': 'hsl(var(--primary))',
  			  '600': 'hsl(var(--primary))',
  			  '700': 'hsl(var(--primary))'
  			},
  			red: {
  			  '300': 'hsl(var(--destructive) / 0.5)',
  			  '400': 'hsl(var(--destructive))',
  			  '500': 'hsl(var(--destructive))',
  			  '600': 'hsl(var(--destructive))'
  			},
  			rose: {
  			  '300': 'hsl(var(--destructive) / 0.5)',
  			  '400': 'hsl(var(--destructive))',
  			  '500': 'hsl(var(--destructive))',
  			  '600': 'hsl(var(--destructive))',
  			  '700': 'hsl(var(--destructive))'
  			},
  			purple: {
  			  '400': 'hsl(var(--chart-2))'
  			},
  			yellow: {
  			  '50': 'hsl(var(--warning) / 0.18)'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: '0' },
  				to: { height: 'var(--radix-accordion-content-height)' }
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to: { height: '0' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}