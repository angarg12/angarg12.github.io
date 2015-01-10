angular.module('incremental',[])
    .controller('IncCtrl',['$scope','$document','$interval', '$sce',function($scope,$document,$interval,$sce) { 
		$scope.version = 0.6;
		
		var startPlayer = {
			cashPerClick:1,
			multiplier: new Decimal(1),
			multiplierUpgradeLevel: [0,
									0,
									0,
									0,
									0],
			multiplierUpgradePrice: [new Decimal(10),
									new Decimal(100),
									new Decimal(10000),
									new Decimal(100000000),
									new Decimal(10000000000000000)],
			clickUpgradeLevel: [0,
								0,
								0,
								0],
			clickUpgradePrice: [0.001,
								0.01,
								0.1,
								1],
			currency: new Decimal(0),
			sprintTime: ['',
						'',
						'',
						''],
			version: $scope.version
			};
		
		var lastUpdate = 0;
        var multiplierUpgradeBasePrice = [new Decimal(10),
										new Decimal(100),
										new Decimal(10000),
										new Decimal(100000000),
										new Decimal(10000000000000000)];
        $scope.multiplierUpgradePower = [0.0001,
									0.001,
									0.01,
									0.1,
									1];
        $scope.clickUpgradePower = [10,
								1000,
								100000,
								10000000];
        
		$scope.currencyValue = function() {
			return $sce.trustAsHtml(prettifyNumber($scope.player.currency));
		}
		
        $scope.click = function() {
			var tempCurrency = $scope.player.currency.plus($scope.player.cashPerClick);
            $scope.player.currency = checkMaxReached(tempCurrency);
        };
        
        $scope.buyMultiplierUpgrade = function(number) {
            if ($scope.player.currency.comparedTo($scope.player.multiplierUpgradePrice[number]) >= 0) {
                $scope.player.currency = $scope.player.currency.minus($scope.player.multiplierUpgradePrice[number]);
                $scope.player.multiplier = $scope.player.multiplier.plus($scope.multiplierUpgradePower[number]);
                $scope.player.multiplierUpgradeLevel[number]++;
				// The cost function is of the form 2^1.x^(upgradeLevel), where 1.x depends on the upgrade tier
				var exponent = Decimal.pow(1+0.2*(number+1),$scope.player.multiplierUpgradeLevel[number]);
				$scope.player.multiplierUpgradePrice[number] = multiplierUpgradeBasePrice[number].
					times(Decimal.pow(2,exponent));
            }
        };
        
        $scope.buyClickUpgrade = function(number) {
            if ($scope.player.multiplier.comparedTo($scope.player.clickUpgradePrice[number])  >= 0) {			
                $scope.player.multiplier = $scope.player.multiplier.minus($scope.player.clickUpgradePrice[number]);
				$scope.player.cashPerClick += $scope.clickUpgradePower[number];
                $scope.player.clickUpgradeLevel[number]++;
            }
        };
		
		$scope.save = function save() {
			localStorage.setItem("playerStored", JSON.stringify($scope.player));
			var d = new Date();
			$scope.lastSave = d.toLocaleTimeString();
		}
		
		$scope.load = function load() {
			$scope.player = JSON.parse(localStorage.getItem("playerStored"));
			$scope.player.currency = new Decimal($scope.player.currency);
		}
		
		$scope.reset = function reset() {
			var confirmation = confirm("Are you sure you want to permanently erase your savefile?");
			if(confirmation === true){
				$scope.player = angular.copy(startPlayer);
				localStorage.removeItem("playerStored");
				clear();
			}
		}
		
		$scope.exportSave = function exportSave() {
			var exportText = btoa(JSON.stringify($scope.player));
			
			document.getElementById("exportSaveContents").style = "display: initial";
			document.getElementById("exportSaveText").value = exportText;
			document.getElementById("exportSaveText").select();
		}
		
		$scope.importSave = function importSave(){
			var importText = prompt("Paste the text you were given by the export save dialog here.\n" +
										"Warning: this will erase your current save!");
			if(importText){
				$scope.player = JSON.parse(atob(importText));
				$scope.player.currency = new Decimal($scope.player.currency);
				versionControl(true);
				save();
				
				clear();
			}
		}
		
        function update() {
            $scope.player.currency = $scope.player.currency.times($scope.player.multiplier);
        };
        
		function checkMaxReached(currency){
			checkSprintFinished(currency);
			if(currency.comparedTo($scope.sprintMax[$scope.sprintMax.length-1]) >= 1){
				return $scope.sprintMax[$scope.sprintMax.length-1];
			}
			return currency;
		}
		
		function checkSprintFinished(currency){
			for(var i = 0; i < $scope.sprintMax.length; i++){
				// If sprintTime is empty string, that means that it hasn't been finished yet
				if(currency.comparedTo($scope.sprintMax[i]) >= 1 && 
				$scope.player.sprintTime[i] == ''){
					if(i == $scope.sprintMax.length-1){
						stop();
					}
					$scope.player.sprintTime[i] = $scope.padCeroes($scope.hours)+":"+$scope.padCeroes($scope.minutes)+":"+$scope.padCeroes($scope.seconds);
					ga('send', 'event', 'sprint', 'finished', 'goal:' + $scope.sprintMax[i] + ',time:' + $scope.player.sprintTime[i] + ',multiplier:' + $scope.player.multiplier);
					
					break;
				}
			}
		};
		
		function prettifyNumber(number){
			if(number.comparedTo(Infinity) == 0){
				return "&infin;";
			}
			if(number.comparedTo(1e21) >= 0){
				// Very ugly way to extract the mantisa and exponent from an exponential string
				var exponential = number.toExponential(15).split("e");
				var exponent = new Decimal(exponential[1].split("+")[1]);
				// And it is displayed in with superscript
				return  exponential[0]+" x 10<sup>"+prettifyNumber(exponent)+"</sup>";
			}
			return number.toString();
		};
		
		function versionControl(ifImport){
			if($scope.player.version < $scope.version || 
				typeof $scope.player.version == 'undefined'){
				$scope.player.version = $scope.version;
			}
		};
		
        $document.ready(function(){
			if(localStorage.getItem("playerStored") != null){
				$scope.load();
			}
			if(typeof $scope.player  === 'undefined'){
				$scope.player = angular.copy(startPlayer);
			}
			if(typeof $scope.lastSave  === 'undefined'){
				$scope.lastSave = "None";
			}
			versionControl(false);
            $interval(update,1000);
            $interval($scope.save,60000);
			start();
        });
		
		/* Timing test code. Not to keep in main branch */
		var t;
		$scope.sprintMax = [new Decimal(1e30),
							new Decimal(1e300),
							new Decimal('1e3000'),
							new Decimal('1e30000')
							];
		$scope.seconds = 0;
		$scope.minutes = 0; 
		$scope.hours = 0;
			
		function add() {
			$scope.seconds++;
			if ($scope.seconds >= 60) {
				$scope.seconds = 0;
				$scope.minutes++;
				if ($scope.minutes >= 60) {
					$scope.minutes = 0;
					$scope.hours++;
				}
			}
		}
		
		function start() {
			if ( angular.isDefined(t) ) return;
			t = $interval(add,1000);
		}
		
		function stop() {
			if (angular.isDefined(t)) {
				$interval.cancel(t);
				t = undefined;
            }
		}
		
		function clear() {
			stop();
			$scope.seconds = 0; 
			$scope.minutes = 0; 
			$scope.hours = 0;
			start();
		}
		
		$scope.padCeroes = function padCeroes(number){
			if(number <= 9){
				return "0"+number;
			}
			return number;
		}
}]);